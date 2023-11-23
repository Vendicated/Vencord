/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { proxyLazy } from "@utils/lazy";
import { LazyComponent } from "@utils/lazyReact";
import { Logger } from "@utils/Logger";
import type { WebpackInstance } from "discord-types/other";

import { traceFunction } from "../debug/Tracer";

const logger = new Logger("Webpack");

export let _resolveReady: () => void;
/**
 * Fired once a gateway connection to Discord has been established.
 * This indicates that the core webpack modules have been initialised
 */
export const onceReady = new Promise<void>(r => _resolveReady = r);

export let wreq: WebpackInstance;
export let cache: WebpackInstance["c"];

export type FilterFn = (mod: any) => boolean;

export const filters = {
    byProps: (...props: string[]): FilterFn =>
        props.length === 1
            ? m => m[props[0]] !== void 0
            : m => props.every(p => m[p] !== void 0),

    byCode: (...code: string[]): FilterFn => m => {
        if (typeof m !== "function") return false;
        const s = Function.prototype.toString.call(m);
        for (const c of code) {
            if (!s.includes(c)) return false;
        }
        return true;
    },
    byStoreName: (name: string): FilterFn => m =>
        m.constructor?.displayName === name,

    componentByCode: (...code: string[]): FilterFn => {
        const filter = filters.byCode(...code);
        return m => {
            if (filter(m)) return true;
            if (!m.$$typeof) return false;
            if (m.type) return filter(m.type); // memos
            if (m.render) return filter(m.render); // forwardRefs
            return false;
        };
    }
};

export const subscriptions = new Map<FilterFn, CallbackFn>();
export const listeners = new Set<CallbackFn>();

export type CallbackFn = (mod: any, id: number) => void;

export function _initWebpack(instance: typeof window.webpackChunkdiscord_app) {
    if (cache !== void 0) throw "no.";

    instance.push([[Symbol("Vencord")], {}, r => wreq = r]);
    instance.pop();
    if (!wreq) return false;

    cache = wreq.c;
    return true;
}

if (IS_DEV && IS_DISCORD_DESKTOP) {
    var devToolsOpen = false;
    // At this point in time, DiscordNative has not been exposed yet, so setImmediate is needed
    setTimeout(() => {
        DiscordNative/* just to make sure */?.window.setDevtoolsCallbacks(() => devToolsOpen = true, () => devToolsOpen = false);
    }, 0);
}

function handleModuleNotFound(method: string, ...filter: unknown[]) {
    const err = new Error(`webpack.${method} found no module`);
    logger.error(err, "Filter:", filter);

    // Strict behaviour in DevBuilds to fail early and make sure the issue is found
    if (IS_DEV && !devToolsOpen)
        throw err;
}

/**
 * Find the first module that matches the filter
 */
export const find = traceFunction("find", function find(filter: FilterFn, { isIndirect = false, isWaitFor = false }: { isIndirect?: boolean; isWaitFor?: boolean; } = {}) {
    if (typeof filter !== "function")
        throw new Error("Invalid filter. Expected a function got " + typeof filter);

    for (const key in cache) {
        const mod = cache[key];
        if (!mod?.exports) continue;

        if (filter(mod.exports)) {
            return isWaitFor ? [mod.exports, Number(key)] : mod.exports;
        }

        if (mod.exports.default && filter(mod.exports.default)) {
            const found = mod.exports.default;
            return isWaitFor ? [found, Number(key)] : found;
        }
    }

    if (!isIndirect) {
        handleModuleNotFound("find", filter);
    }

    return isWaitFor ? [null, null] : null;
});

/**
 * find but lazy
 */
export function findLazy(filter: FilterFn) {
    return proxyLazy(() => find(filter));
}

export function findAll(filter: FilterFn) {
    if (typeof filter !== "function")
        throw new Error("Invalid filter. Expected a function got " + typeof filter);

    const ret = [] as any[];
    for (const key in cache) {
        const mod = cache[key];
        if (!mod?.exports) continue;

        if (filter(mod.exports))
            ret.push(mod.exports);

        if (mod.exports.default && filter(mod.exports.default))
            ret.push(mod.exports.default);
    }

    return ret;
}

/**
 * Same as {@link find} but in bulk
 * @param filterFns Array of filters. Please note that this array will be modified in place, so if you still
 *                need it afterwards, pass a copy.
 * @returns Array of results in the same order as the passed filters
 */
export const findBulk = traceFunction("findBulk", function findBulk(...filterFns: FilterFn[]) {
    if (!Array.isArray(filterFns))
        throw new Error("Invalid filters. Expected function[] got " + typeof filterFns);

    const { length } = filterFns;

    if (length === 0)
        throw new Error("Expected at least two filters.");

    if (length === 1) {
        if (IS_DEV) {
            throw new Error("bulk called with only one filter. Use find");
        }
        return find(filterFns[0]);
    }

    const filters = filterFns as Array<FilterFn | undefined>;

    let found = 0;
    const results = Array(length);

    outer:
    for (const key in cache) {
        const mod = cache[key];
        if (!mod?.exports) continue;

        for (let j = 0; j < length; j++) {
            const filter = filters[j];
            // Already done
            if (filter === undefined) continue;

            if (filter(mod.exports)) {
                results[j] = mod.exports;
                filters[j] = undefined;
                if (++found === length) break outer;
                break;
            }

            if (mod.exports.default && filter(mod.exports.default)) {
                results[j] = mod.exports.default;
                filters[j] = undefined;
                if (++found === length) break outer;
                break;
            }
        }
    }

    if (found !== length) {
        const err = new Error(`Got ${length} filters, but only found ${found} modules!`);
        if (IS_DEV) {
            if (!devToolsOpen)
                // Strict behaviour in DevBuilds to fail early and make sure the issue is found
                throw err;
        } else {
            logger.warn(err);
        }
    }

    return results;
});

/**
 * Find the id of a module by its code
 * @param code Code
 * @returns number or null
 */
export const findModuleId = traceFunction("findModuleId", function findModuleId(code: string) {
    for (const id in wreq.m) {
        if (wreq.m[id].toString().includes(code)) {
            return Number(id);
        }
    }

    const err = new Error("Didn't find module with code:\n" + code);
    if (IS_DEV) {
        if (!devToolsOpen)
            // Strict behaviour in DevBuilds to fail early and make sure the issue is found
            throw err;
    } else {
        logger.warn(err);
    }

    return null;
});

/**
 * Find the first module that has the specified properties
 */
export function findByProps(...props: string[]) {
    const res = find(filters.byProps(...props), { isIndirect: true });
    if (!res)
        handleModuleNotFound("findByProps", ...props);
    return res;
}

/**
 * findByProps but lazy
 */
export function findByPropsLazy(...props: string[]) {
    return proxyLazy(() => findByProps(...props));
}

/**
 * Find a function by its code
 */
export function findByCode(...code: string[]) {
    const res = find(filters.byCode(...code), { isIndirect: true });
    if (!res)
        handleModuleNotFound("findByCode", ...code);
    return res;
}

/**
 * findByCode but lazy
 */
export function findByCodeLazy(...code: string[]) {
    return proxyLazy(() => findByCode(...code));
}

/**
 * Find a store by its displayName
 */
export function findStore(name: string) {
    const res = find(filters.byStoreName(name), { isIndirect: true });
    if (!res)
        handleModuleNotFound("findStore", name);
    return res;
}

/**
 * findStore but lazy
 */
export function findStoreLazy(name: string) {
    return proxyLazy(() => findStore(name));
}

/**
 * Finds the component which includes all the given code. Checks for plain components, memos and forwardRefs
 */
export function findComponentByCode(...code: string[]) {
    const res = find(filters.componentByCode(...code), { isIndirect: true });
    if (!res)
        handleModuleNotFound("findComponentByCode", ...code);
    return res;
}

/**
 * Finds the first component that matches the filter, lazily.
 */
export function findComponentLazy<T extends object = any>(filter: FilterFn) {
    return LazyComponent<T>(() => find(filter));
}

/**
 * Finds the first component that includes all the given code, lazily
 */
export function findComponentByCodeLazy<T extends object = any>(...code: string[]) {
    return LazyComponent<T>(() => findComponentByCode(...code));
}

/**
 * Finds the first component that is exported by the first prop name, lazily
 */
export function findExportedComponentLazy<T extends object = any>(...props: string[]) {
    return LazyComponent<T>(() => findByProps(...props)?.[props[0]]);
}

/**
 * Wait for a module that matches the provided filter to be registered,
 * then call the callback with the module as the first argument
 */
export function waitFor(filter: string | string[] | FilterFn, callback: CallbackFn) {
    if (typeof filter === "string")
        filter = filters.byProps(filter);
    else if (Array.isArray(filter))
        filter = filters.byProps(...filter);
    else if (typeof filter !== "function")
        throw new Error("filter must be a string, string[] or function, got " + typeof filter);

    const [existing, id] = find(filter!, { isIndirect: true, isWaitFor: true });
    if (existing) return void callback(existing, id);

    subscriptions.set(filter, callback);
}

export function addListener(callback: CallbackFn) {
    listeners.add(callback);
}

export function removeListener(callback: CallbackFn) {
    listeners.delete(callback);
}

/**
 * Search modules by keyword. This searches the factory methods,
 * meaning you can search all sorts of things, displayName, methodName, strings somewhere in the code, etc
 * @param filters One or more strings or regexes
 * @returns Mapping of found modules
 */
export function search(...filters: Array<string | RegExp>) {
    const results = {} as Record<number, Function>;
    const factories = wreq.m;
    outer:
    for (const id in factories) {
        const factory = factories[id].original ?? factories[id];
        const str: string = factory.toString();
        for (const filter of filters) {
            if (typeof filter === "string" && !str.includes(filter)) continue outer;
            if (filter instanceof RegExp && !filter.test(str)) continue outer;
        }
        results[id] = factory;
    }

    return results;
}

/**
 * Extract a specific module by id into its own Source File. This has no effect on
 * the code, it is only useful to be able to look at a specific module without having
 * to view a massive file. extract then returns the extracted module so you can jump to it.
 * As mentioned above, note that this extracted module is not actually used,
 * so putting breakpoints or similar will have no effect.
 * @param id The id of the module to extract
 */
export function extract(id: number) {
    const mod = wreq.m[id] as Function;
    if (!mod) return null;

    const code = `
// [EXTRACTED] WebpackModule${id}
// WARNING: This module was extracted to be more easily readable.
//          This module is NOT ACTUALLY USED! This means putting breakpoints will have NO EFFECT!!

0,${mod.toString()}
//# sourceURL=ExtractedWebpackModule${id}
`;
    const extracted = (0, eval)(code);
    return extracted as Function;
}

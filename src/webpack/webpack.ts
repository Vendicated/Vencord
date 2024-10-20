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

import { makeLazy, proxyLazy } from "@utils/lazy";
import { LazyComponent } from "@utils/lazyReact";
import { Logger } from "@utils/Logger";
import { canonicalizeMatch } from "@utils/patches";
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

export type PropsFilter = Array<string>;
export type CodeFilter = Array<string | RegExp>;
export type StoreNameFilter = string;

export const stringMatches = (s: string, filter: CodeFilter) =>
    filter.every(f =>
        typeof f === "string"
            ? s.includes(f)
            : (f.global && (f.lastIndex = 0), f.test(s))
    );

export const filters = {
    byProps: (...props: PropsFilter): FilterFn =>
        props.length === 1
            ? m => m[props[0]] !== void 0
            : m => props.every(p => m[p] !== void 0),

    byCode: (...code: CodeFilter): FilterFn => {
        code = code.map(canonicalizeMatch);
        return m => {
            if (typeof m !== "function") return false;
            return stringMatches(Function.prototype.toString.call(m), code);
        };
    },
    byStoreName: (name: StoreNameFilter): FilterFn => m =>
        m.constructor?.displayName === name,

    componentByCode: (...code: CodeFilter): FilterFn => {
        const filter = filters.byCode(...code);
        return m => {
            if (filter(m)) return true;
            if (!m.$$typeof) return false;
            if (m.type)
                return m.type.render
                    ? filter(m.type.render) // memo + forwardRef
                    : filter(m.type); // memo
            if (m.render) return filter(m.render); // forwardRef
            return false;
        };
    }
};

export type CallbackFn = (mod: any, id: string) => void;

export const subscriptions = new Map<FilterFn, CallbackFn>();
export const moduleListeners = new Set<CallbackFn>();
export const factoryListeners = new Set<(factory: (module: any, exports: any, require: WebpackInstance) => void) => void>();
export const beforeInitListeners = new Set<(wreq: WebpackInstance) => void>();

export function _initWebpack(webpackRequire: WebpackInstance) {
    wreq = webpackRequire;
    cache = webpackRequire.c;
}

let devToolsOpen = false;
if (IS_DEV && IS_DISCORD_DESKTOP) {
    // At this point in time, DiscordNative has not been exposed yet, so setImmediate is needed
    setTimeout(() => {
        DiscordNative/* just to make sure */?.window.setDevtoolsCallbacks(() => devToolsOpen = true, () => devToolsOpen = false);
    }, 0);
}

export function handleModuleNotFound(method: string, ...filter: unknown[]) {
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
        if (!mod.loaded || !mod?.exports) continue;

        if (filter(mod.exports)) {
            return isWaitFor ? [mod.exports, key] : mod.exports;
        }

        if (typeof mod.exports !== "object") continue;

        if (mod.exports.default && filter(mod.exports.default)) {
            const found = mod.exports.default;
            return isWaitFor ? [found, key] : found;
        }

        // the length check makes search about 20% faster
        for (const nestedMod in mod.exports) if (nestedMod.length <= 3) {
            const nested = mod.exports[nestedMod];
            if (nested && filter(nested)) {
                return isWaitFor ? [nested, key] : nested;
            }
        }
    }

    if (!isIndirect) {
        handleModuleNotFound("find", filter);
    }

    return isWaitFor ? [null, null] : null;
});

export function findAll(filter: FilterFn) {
    if (typeof filter !== "function")
        throw new Error("Invalid filter. Expected a function got " + typeof filter);

    const ret = [] as any[];
    for (const key in cache) {
        const mod = cache[key];
        if (!mod.loaded || !mod?.exports) continue;

        if (filter(mod.exports))
            ret.push(mod.exports);
        else if (typeof mod.exports !== "object")
            continue;

        if (mod.exports.default && filter(mod.exports.default))
            ret.push(mod.exports.default);
        else for (const nestedMod in mod.exports) if (nestedMod.length <= 3) {
            const nested = mod.exports[nestedMod];
            if (nested && filter(nested)) ret.push(nested);
        }
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
        if (!mod.loaded || !mod?.exports) continue;

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

            if (typeof mod.exports !== "object")
                continue;

            if (mod.exports.default && filter(mod.exports.default)) {
                results[j] = mod.exports.default;
                filters[j] = undefined;
                if (++found === length) break outer;
                break;
            }

            for (const nestedMod in mod.exports)
                if (nestedMod.length <= 3) {
                    const nested = mod.exports[nestedMod];
                    if (nested && filter(nested)) {
                        results[j] = nested;
                        filters[j] = undefined;
                        if (++found === length) break outer;
                        continue outer;
                    }
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
 * Find the id of the first module factory that includes all the given code
 * @returns string or null
 */
export const findModuleId = traceFunction("findModuleId", function findModuleId(...code: CodeFilter) {
    code = code.map(canonicalizeMatch);

    for (const id in wreq.m) {
        if (stringMatches(wreq.m[id].toString(), code)) return id;
    }

    const err = new Error("Didn't find module with code(s):\n" + code.join("\n"));
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
 * Find the first module factory that includes all the given code
 * @returns The module factory or null
 */
export function findModuleFactory(...code: CodeFilter) {
    const id = findModuleId(...code);
    if (!id) return null;

    return wreq.m[id];
}

export const lazyWebpackSearchHistory = [] as Array<["find" | "findByProps" | "findByCode" | "findStore" | "findComponent" | "findComponentByCode" | "findExportedComponent" | "waitFor" | "waitForComponent" | "waitForStore" | "proxyLazyWebpack" | "LazyComponentWebpack" | "extractAndLoadChunks" | "mapMangledModule", any[]]>;

/**
 * This is just a wrapper around {@link proxyLazy} to make our reporter test for your webpack finds.
 *
 * Wraps the result of {@link makeLazy} in a Proxy you can consume as if it wasn't lazy.
 * On first property access, the lazy is evaluated
 * @param factory lazy factory
 * @param attempts how many times to try to evaluate the lazy before giving up
 * @returns Proxy
 *
 * Note that the example below exists already as an api, see {@link findByPropsLazy}
 * @example const mod = proxyLazy(() => findByProps("blah")); console.log(mod.blah);
 */
export function proxyLazyWebpack<T = any>(factory: () => T, attempts?: number) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["proxyLazyWebpack", [factory]]);

    return proxyLazy<T>(factory, attempts);
}

/**
 * This is just a wrapper around {@link LazyComponent} to make our reporter test for your webpack finds.
 *
 * A lazy component. The factory method is called on first render.
 * @param factory Function returning a Component
 * @param attempts How many times to try to get the component before giving up
 * @returns Result of factory function
 */
export function LazyComponentWebpack<T extends object = any>(factory: () => any, attempts?: number) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["LazyComponentWebpack", [factory]]);

    return LazyComponent<T>(factory, attempts);
}

/**
 * Find the first module that matches the filter, lazily
 */
export function findLazy(filter: FilterFn) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["find", [filter]]);

    return proxyLazy(() => find(filter));
}

/**
 * Find the first module that has the specified properties
 */
export function findByProps(...props: PropsFilter) {
    const res = find(filters.byProps(...props), { isIndirect: true });
    if (!res)
        handleModuleNotFound("findByProps", ...props);
    return res;
}

/**
 * Find the first module that has the specified properties, lazily
 */
export function findByPropsLazy(...props: PropsFilter) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["findByProps", props]);

    return proxyLazy(() => findByProps(...props));
}

/**
 * Find the first function that includes all the given code
 */
export function findByCode(...code: CodeFilter) {
    const res = find(filters.byCode(...code), { isIndirect: true });
    if (!res)
        handleModuleNotFound("findByCode", ...code);
    return res;
}

/**
 * Find the first function that includes all the given code, lazily
 */
export function findByCodeLazy(...code: CodeFilter) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["findByCode", code]);

    return proxyLazy(() => findByCode(...code));
}

/**
 * Find a store by its displayName
 */
export function findStore(name: StoreNameFilter) {
    const res = find(filters.byStoreName(name), { isIndirect: true });
    if (!res)
        handleModuleNotFound("findStore", name);
    return res;
}

/**
 * Find a store by its displayName, lazily
 */
export function findStoreLazy(name: StoreNameFilter) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["findStore", [name]]);

    return proxyLazy(() => findStore(name));
}

/**
 * Finds the component which includes all the given code. Checks for plain components, memos and forwardRefs
 */
export function findComponentByCode(...code: CodeFilter) {
    const res = find(filters.componentByCode(...code), { isIndirect: true });
    if (!res)
        handleModuleNotFound("findComponentByCode", ...code);
    return res;
}

/**
 * Finds the first component that matches the filter, lazily.
 */
export function findComponentLazy<T extends object = any>(filter: FilterFn) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["findComponent", [filter]]);


    return LazyComponent<T>(() => {
        const res = find(filter, { isIndirect: true });
        if (!res)
            handleModuleNotFound("findComponent", filter);
        return res;
    });
}

/**
 * Finds the first component that includes all the given code, lazily
 */
export function findComponentByCodeLazy<T extends object = any>(...code: CodeFilter) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["findComponentByCode", code]);

    return LazyComponent<T>(() => {
        const res = find(filters.componentByCode(...code), { isIndirect: true });
        if (!res)
            handleModuleNotFound("findComponentByCode", ...code);
        return res;
    });
}

/**
 * Finds the first component that is exported by the first prop name, lazily
 */
export function findExportedComponentLazy<T extends object = any>(...props: PropsFilter) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["findExportedComponent", props]);

    return LazyComponent<T>(() => {
        const res = find(filters.byProps(...props), { isIndirect: true });
        if (!res)
            handleModuleNotFound("findExportedComponent", ...props);
        return res[props[0]];
    });
}

/**
 * Finds a mangled module by the provided code "code" (must be unique and can be anywhere in the module)
 * then maps it into an easily usable module via the specified mappers.
 *
 * @param code The code to look for
 * @param mappers Mappers to create the non mangled exports
 * @returns Unmangled exports as specified in mappers
 *
 * @example mapMangledModule("headerIdIsManaged:", {
 *             openModal: filters.byCode("headerIdIsManaged:"),
 *             closeModal: filters.byCode("key==")
 *          })
 */
export const mapMangledModule = traceFunction("mapMangledModule", function mapMangledModule<S extends string>(code: string | RegExp | CodeFilter, mappers: Record<S, FilterFn>): Record<S, any> {
    const exports = {} as Record<S, any>;

    const id = findModuleId(...Array.isArray(code) ? code : [code]);
    if (id === null)
        return exports;

    const mod = wreq(id as any);
    outer:
    for (const key in mod) {
        const member = mod[key];
        for (const newName in mappers) {
            // if the current mapper matches this module
            if (mappers[newName](member)) {
                exports[newName] = member;
                continue outer;
            }
        }
    }
    return exports;
});

/**
 * {@link mapMangledModule}, lazy.

 * Finds a mangled module by the provided code "code" (must be unique and can be anywhere in the module)
 * then maps it into an easily usable module via the specified mappers.
 *
 * @param code The code to look for
 * @param mappers Mappers to create the non mangled exports
 * @returns Unmangled exports as specified in mappers
 *
 * @example mapMangledModule("headerIdIsManaged:", {
 *             openModal: filters.byCode("headerIdIsManaged:"),
 *             closeModal: filters.byCode("key==")
 *          })
 */
export function mapMangledModuleLazy<S extends string>(code: string | RegExp | CodeFilter, mappers: Record<S, FilterFn>): Record<S, any> {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["mapMangledModule", [code, mappers]]);

    return proxyLazy(() => mapMangledModule(code, mappers));
}

export const DefaultExtractAndLoadChunksRegex = /(?:(?:Promise\.all\(\[)?(\i\.e\("?[^)]+?"?\)[^\]]*?)(?:\]\))?|Promise\.resolve\(\))\.then\(\i\.bind\(\i,"?([^)]+?)"?\)\)/;
export const ChunkIdsRegex = /\("([^"]+?)"\)/g;

/**
 * Extract and load chunks using their entry point
 * @param code An array of all the code the module factory containing the lazy chunk loading must include
 * @param matcher A RegExp that returns the chunk ids array as the first capture group and the entry point id as the second. Defaults to a matcher that captures the first lazy chunk loading found in the module factory
 * @returns A promise that resolves with a boolean whether the chunks were loaded
 */
export async function extractAndLoadChunks(code: CodeFilter, matcher: RegExp = DefaultExtractAndLoadChunksRegex) {
    const module = findModuleFactory(...code);
    if (!module) {
        const err = new Error("extractAndLoadChunks: Couldn't find module factory");
        logger.warn(err, "Code:", code, "Matcher:", matcher);

        // Strict behaviour in DevBuilds to fail early and make sure the issue is found
        if (IS_DEV && !devToolsOpen)
            throw err;

        return false;
    }

    const match = module.toString().match(canonicalizeMatch(matcher));
    if (!match) {
        const err = new Error("extractAndLoadChunks: Couldn't find chunk loading in module factory code");
        logger.warn(err, "Code:", code, "Matcher:", matcher);

        // Strict behaviour in DevBuilds to fail early and make sure the issue is found
        if (IS_DEV && !devToolsOpen)
            throw err;

        return false;
    }

    const [, rawChunkIds, entryPointId] = match;
    if (Number.isNaN(Number(entryPointId))) {
        const err = new Error("extractAndLoadChunks: Matcher didn't return a capturing group with the chunk ids array, or the entry point id returned as the second group wasn't a number");
        logger.warn(err, "Code:", code, "Matcher:", matcher);

        // Strict behaviour in DevBuilds to fail early and make sure the issue is found
        if (IS_DEV && !devToolsOpen)
            throw err;

        return false;
    }

    if (rawChunkIds) {
        const chunkIds = Array.from(rawChunkIds.matchAll(ChunkIdsRegex)).map((m: any) => Number(m[1]));
        await Promise.all(chunkIds.map(id => wreq.e(id)));
    }

    if (wreq.m[entryPointId] == null) {
        const err = new Error("extractAndLoadChunks: Entry point is not loaded in the module factories, perhaps one of the chunks failed to load");
        logger.warn(err, "Code:", code, "Matcher:", matcher);

        // Strict behaviour in DevBuilds to fail early and make sure the issue is found
        if (IS_DEV && !devToolsOpen)
            throw err;

        return false;
    }

    wreq(Number(entryPointId));
    return true;
}

/**
 * This is just a wrapper around {@link extractAndLoadChunks} to make our reporter test for your webpack finds.
 *
 * Extract and load chunks using their entry point
 * @param code An array of all the code the module factory containing the lazy chunk loading must include
 * @param matcher A RegExp that returns the chunk ids array as the first capture group and the entry point id as the second. Defaults to a matcher that captures the first lazy chunk loading found in the module factory
 * @returns A function that returns a promise that resolves with a boolean whether the chunks were loaded, on first call
 */
export function extractAndLoadChunksLazy(code: CodeFilter, matcher = DefaultExtractAndLoadChunksRegex) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["extractAndLoadChunks", [code, matcher]]);

    return makeLazy(() => extractAndLoadChunks(code, matcher));
}

/**
 * Wait for a module that matches the provided filter to be registered,
 * then call the callback with the module as the first argument
 */
export function waitFor(filter: string | PropsFilter | FilterFn, callback: CallbackFn, { isIndirect = false }: { isIndirect?: boolean; } = {}) {
    if (IS_REPORTER && !isIndirect) lazyWebpackSearchHistory.push(["waitFor", Array.isArray(filter) ? filter : [filter]]);

    if (typeof filter === "string")
        filter = filters.byProps(filter);
    else if (Array.isArray(filter))
        filter = filters.byProps(...filter);
    else if (typeof filter !== "function")
        throw new Error("filter must be a string, string[] or function, got " + typeof filter);

    if (cache != null) {
        const [existing, id] = find(filter, { isIndirect: true, isWaitFor: true });
        if (existing) return void callback(existing, id);
    }

    subscriptions.set(filter, callback);
}

/**
 * Search modules by keyword. This searches the factory methods,
 * meaning you can search all sorts of things, displayName, methodName, strings somewhere in the code, etc
 * @param code One or more strings or regexes
 * @returns Mapping of found modules
 */
export function search(...code: CodeFilter) {
    code = code.map(canonicalizeMatch);

    const results = {} as Record<number, Function>;
    const factories = wreq.m;

    for (const id in factories) {
        const factory = factories[id].original ?? factories[id];

        if (stringMatches(factory.toString(), code))
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
export function extract(id: string | number) {
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

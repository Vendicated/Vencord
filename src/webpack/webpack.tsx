/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated, Nuckyz and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeLazy, proxyLazy } from "@utils/lazy";
import { LazyComponent, LazyComponentType, SYM_LAZY_COMPONENT_INNER } from "@utils/lazyReact";
import { Logger } from "@utils/Logger";
import { canonicalizeMatch } from "@utils/patches";
import { ProxyInner, proxyInner, SYM_PROXY_INNER_VALUE } from "@utils/proxyInner";
import { AnyObject } from "@utils/types";

import { traceFunction } from "../debug/Tracer";
import { GenericStore } from "./common";
import { AnyModuleFactory, ModuleExports, ModuleFactory, WebpackRequire } from "./wreq";

const logger = new Logger("Webpack");

export let _resolveDiscordLoaded: () => void;
/**
 * Fired once a gateway connection to Discord has been established.
 * This indicates that the core Webpack modules have been initialized, and we are logged in.
 */
export const onceDiscordLoaded = new Promise<void>(r => _resolveDiscordLoaded = r);

export let wreq: WebpackRequire;
export let cache: WebpackRequire["c"];

export type FilterFn = ((module: ModuleExports) => boolean) & {
    $$vencordProps?: string[];
    $$vencordIsFactoryFilter?: boolean;
};

export const filters = {
    byProps: (...props: string[]): FilterFn => {
        const filter: FilterFn = props.length === 1
            ? m => m?.[props[0]] !== void 0
            : m => props.every(p => m?.[p] !== void 0);

        filter.$$vencordProps = ["byProps", ...props];
        return filter;
    },

    byCode: (...code: string[]): FilterFn => {
        const filter: FilterFn = m => {
            if (typeof m !== "function") return false;
            const s = String(m);
            for (const c of code) {
                if (!s.includes(c)) return false;
            }
            return true;
        };

        filter.$$vencordProps = ["byCode", ...code];
        return filter;
    },

    byStoreName: (name: string): FilterFn => {
        const filter: FilterFn = m => m?.constructor?.displayName === name;

        filter.$$vencordProps = ["byStoreName", name];
        return filter;
    },

    byComponentCode: (...code: string[]): FilterFn => {
        const byCodeFilter = filters.byCode(...code);
        const filter: FilterFn = m => {
            let inner = m;

            while (inner != null) {
                if (byCodeFilter(inner)) return true;
                else if (!inner.$$typeof) return false;
                else if (inner.type) inner = inner.type; // memos
                else if (inner.render) inner = inner.render; // forwardRefs
                else return false;
            }

            return false;
        };

        filter.$$vencordProps = ["componentByCode", ...code];
        return filter;
    },

    byFactoryCode: (...code: string[]): FilterFn => {
        const byCodeFilter = filters.byCode(...code);

        byCodeFilter.$$vencordProps = ["byFactoryCode", ...code];
        byCodeFilter.$$vencordIsFactoryFilter = true;

        return byCodeFilter;
    }
};

export type ModListenerInfo = {
    id: PropertyKey;
    factory: AnyModuleFactory;
};

export type ModCallbackInfo = {
    id: PropertyKey;
    exportKey: PropertyKey | null;
    factory: AnyModuleFactory;
};

export type ModListenerFn = (module: ModuleExports, info: ModListenerInfo) => void;
export type ModCallbackFn = ((module: ModuleExports, info: ModCallbackInfo) => void) & {
    $$vencordCallbackCalled?: () => boolean;
};

export const factoryListeners = new Set<(factory: AnyModuleFactory) => void>();
export const moduleListeners = new Set<ModListenerFn>();
export const waitForSubscriptions = new Map<FilterFn, ModCallbackFn>();

export function _initWebpack(webpackRequire: WebpackRequire) {
    wreq = webpackRequire;

    if (webpackRequire.c == null) return;
    cache = webpackRequire.c;

    Reflect.defineProperty(webpackRequire.c, Symbol.toStringTag, {
        value: "ModuleCache",
        configurable: true,
        writable: true,
        enumerable: false
    });
}

let devToolsOpen = false;
if (IS_DEV && IS_DISCORD_DESKTOP) {
    // At this point in time, DiscordNative has not been exposed yet, so setImmediate is needed
    setTimeout(() => {
        DiscordNative?.window.setDevtoolsCallbacks(() => devToolsOpen = true, () => devToolsOpen = false);
    }, 0);
}

export const webpackSearchHistory = [] as Array<["waitFor" | "find" | "findComponent" | "findExportedComponent" | "findComponentByCode" | "findByProps" | "findByCode" | "findStore" | "findByFactoryCode" | "mapMangledModule" | "extractAndLoadChunks" | "webpackDependantLazy" | "webpackDependantLazyComponent", any[]]>;

function printFilter(filter: FilterFn) {
    if (filter.$$vencordProps != null) {
        const props = filter.$$vencordProps;
        return `${props[0]}(${props.slice(1).map(arg => JSON.stringify(arg)).join(", ")})`;
    }

    return filter.toString();
}

/**
 * Wait for the first export or module exports that matches the provided filter to be required,
 * then call the callback with the export or module exports as the first argument.
 *
 * If the module containing the export(s) is already required, the callback will be called immediately.
 *
 * @param filter A function that takes an export or module exports and returns a boolean
 * @param callback A function that takes the find result as its first argument
 */
export function waitFor(filter: FilterFn, callback: ModCallbackFn, { isIndirect = false }: { isIndirect?: boolean; } = {}) {
    if (typeof filter !== "function")
        throw new Error("Invalid filter. Expected a function got " + typeof filter);
    if (typeof callback !== "function")
        throw new Error("Invalid callback. Expected a function got " + typeof callback);

    if (IS_REPORTER && !isIndirect) {
        const originalCallback = callback;

        let callbackCalled = false;
        callback = function (this: unknown) {
            callbackCalled = true;

            Reflect.apply(originalCallback, this, arguments);
        };

        callback.$$vencordCallbackCalled = () => callbackCalled;
        webpackSearchHistory.push(["waitFor", [callback, filter]]);
    }

    if (cache != null) {
        const { result, id, exportKey, factory } = _cacheFind(filter);
        if (result != null) return callback(result, { id: id!, exportKey: exportKey as PropertyKey | null, factory: factory! });
    }

    waitForSubscriptions.set(filter, callback);
}

/**
 * Find the first export or module exports that matches the filter.
 *
 * The way this works internally is:
 * Wait for the first export or module exports that matches the provided filter to be required,
 * then call the callback with the export or module exports as the first argument.
 *
 * If the module containing the export(s) is already required, the callback will be called immediately.
 *
 * The callback must return a value that will be used as the proxy inner value.
 *
 * If no callback is specified, the default callback will assign the proxy inner value to the plain find result
 *
 * @param filter A function that takes an export or module exports and returns a boolean
 * @param callback A function that takes the find result as its first argument and returns something to use as the proxy inner value. Useful if you want to use a value from the find result, instead of all of it. Defaults to the find result itself
 * @returns A proxy that has the callback return value as its true value, or the callback return value if the callback was called when the function was called
 */
export function find<T = AnyObject>(filter: FilterFn, callback: (module: ModuleExports) => any = m => m, { isIndirect = false }: { isIndirect?: boolean; } = {}) {
    if (typeof filter !== "function")
        throw new Error("Invalid filter. Expected a function got " + typeof filter);
    if (typeof callback !== "function")
        throw new Error("Invalid callback. Expected a function got " + typeof callback);

    const [proxy, setInnerValue] = proxyInner<T>(`Webpack find matched no module. Filter: ${printFilter(filter)}`, "Webpack find with proxy called on a primitive value. This can happen if you try to destructure a primitive in the top level definition of the find.");
    waitFor(filter, m => setInnerValue(callback(m)), { isIndirect: true });

    if (IS_REPORTER && !isIndirect) {
        webpackSearchHistory.push(["find", [proxy, filter]]);
    }

    if (proxy[SYM_PROXY_INNER_VALUE] != null) return proxy[SYM_PROXY_INNER_VALUE] as ProxyInner<T>;

    return proxy;
}

/**
 * Find the first exported component that matches the filter.
 *
 * @param filter A function that takes an export or module exports and returns a boolean
 * @param parse A function that takes the found component as its first argument and returns a component. Useful if you want to wrap the found component in something. Defaults to the original component
 * @returns The component if found, or a noop component
 */
export function findComponent<T extends object = any>(filter: FilterFn, parse: (component: ModuleExports) => LazyComponentType<T> = m => m, { isIndirect = false }: { isIndirect?: boolean; } = {}) {
    if (typeof filter !== "function")
        throw new Error("Invalid filter. Expected a function got " + typeof filter);
    if (typeof parse !== "function")
        throw new Error("Invalid component parse. Expected a function got " + typeof parse);

    let InnerComponent = null as LazyComponentType<T> | null;

    let findFailedLogged = false;
    const WrapperComponent = (props: T) => {
        if (InnerComponent === null && !findFailedLogged) {
            findFailedLogged = true;
            logger.error(`Webpack find matched no module. Filter: ${printFilter(filter)}`);
        }

        return InnerComponent && <InnerComponent {...props} />;
    };

    WrapperComponent[SYM_LAZY_COMPONENT_INNER] = () => InnerComponent;

    waitFor(filter, (v: any) => {
        const parsedComponent = parse(v);
        InnerComponent = parsedComponent;
        Object.assign(WrapperComponent, parsedComponent);
    }, { isIndirect: true });

    if (IS_REPORTER && !isIndirect) {
        webpackSearchHistory.push(["findComponent", [WrapperComponent, filter]]);
    }

    if (InnerComponent !== null) return InnerComponent;

    return WrapperComponent as LazyComponentType<T>;
}

/**
 * Find the first component that is exported by the first prop name.
 *
 * @example findExportedComponent("FriendRow")
 * @example findExportedComponent("FriendRow", "Friend", FriendRow => React.memo(FriendRow))
 *
 * @param props A list of prop names to search the exports for
 * @param parse A function that takes the found component as its first argument and returns a component. Useful if you want to wrap the found component in something. Defaults to the original component
 * @returns The component if found, or a noop component
 */
export function findExportedComponent<T extends object = any>(...props: string[] | [...string[], (component: ModuleExports) => LazyComponentType<T>]) {
    const parse = (typeof props.at(-1) === "function" ? props.pop() : m => m) as (component: ModuleExports) => LazyComponentType<T>;
    const newProps = props as string[];

    const filter = filters.byProps(...newProps);

    let InnerComponent = null as LazyComponentType<T> | null;

    let findFailedLogged = false;
    const WrapperComponent = (props: T) => {
        if (InnerComponent === null && !findFailedLogged) {
            findFailedLogged = true;
            logger.error(`Webpack find matched no module. Filter: ${printFilter(filter)}`);
        }

        return InnerComponent && <InnerComponent {...props} />;
    };

    WrapperComponent[SYM_LAZY_COMPONENT_INNER] = () => InnerComponent;

    waitFor(filter, (v: any) => {
        const parsedComponent = parse(v[newProps[0]]);
        InnerComponent = parsedComponent;
        Object.assign(WrapperComponent, parsedComponent);
    }, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findExportedComponent", [WrapperComponent, ...newProps]]);
    }

    if (InnerComponent !== null) return InnerComponent;

    return WrapperComponent as LazyComponentType<T>;
}

/**
 * Find the first component in an export that includes all the given code.
 *
 * @example findComponentByCode(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR")
 * @example findComponentByCode(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)", ColorPicker => React.memo(ColorPicker))
 *
 * @param code A list of code to search each export for
 * @param parse A function that takes the found component as its first argument and returns a component. Useful if you want to wrap the found component in something. Defaults to the original component
 * @returns The component if found, or a noop component
 */
export function findComponentByCode<T extends object = any>(...code: string[] | [...string[], (component: ModuleExports) => LazyComponentType<T>]) {
    const parse = (typeof code.at(-1) === "function" ? code.pop() : m => m) as (component: ModuleExports) => LazyComponentType<T>;
    const newCode = code as string[];

    const ComponentResult = findComponent<T>(filters.byComponentCode(...newCode), parse, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findComponentByCode", [ComponentResult, ...newCode]]);
    }

    return ComponentResult;
}

/**
 * Find the first module exports or export that includes all the given props.
 *
 * @param props A list of props to search the module or exports for
 */
export function findByProps<T = AnyObject>(...props: string[]) {
    const result = find<T>(filters.byProps(...props), m => m, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findByProps", [result, ...props]]);
    }

    return result;
}

/**
 * Find the first export that includes all the given code.
 *
 * @param code A list of code to search each export for
 */
export function findByCode<T = AnyObject>(...code: string[]) {
    const result = find<T>(filters.byCode(...code), m => m, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findByCode", [result, ...code]]);
    }

    return result;
}

/**
 * Find a store by its name.
 *
 * @param name The store name
 */
export function findStore<T = GenericStore>(name: string) {
    const result = find<T>(filters.byStoreName(name), m => m, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findStore", [result, name]]);
    }

    return result;
}

/**
 * Find the module exports of the first module which the factory includes all the given code.
 *
 * @param code A list of code to search each factory for
 */
export function findByFactoryCode<T = AnyObject>(...code: string[]) {
    const result = find<T>(filters.byFactoryCode(...code), m => m, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findByFactoryCode", [result, ...code]]);
    }

    return result;
}

/**
 * Find the first module factory that includes all the given code.
 */
export function findModuleFactory(...code: string[]) {
    const filter = filters.byFactoryCode(...code);

    const [proxy, setInnerValue] = proxyInner<AnyModuleFactory>(`Webpack module factory find matched no module. Filter: ${printFilter(filter)}`, "Webpack find with proxy called on a primitive value. This can happen if you try to destructure a primitive in the top level definition of the find.");
    waitFor(filter, (_, { factory }) => setInnerValue(factory));

    if (proxy[SYM_PROXY_INNER_VALUE] != null) return proxy[SYM_PROXY_INNER_VALUE] as ProxyInner<AnyModuleFactory>;

    return proxy;
}

/**
 * Find the module exports of the first module which the factory includes all the given code,
 * then map them into an easily usable object via the specified mappers.
 *
 * @example
 * const Modals = mapMangledModule("headerIdIsManaged:", {
 *     openModal: filters.byCode("headerIdIsManaged:"),
 *     closeModal: filters.byCode("key==")
 * });
 *
 * @param code The code or list of code to search each factory for
 * @param mappers Mappers to create the non mangled exports object
 * @returns Unmangled exports as specified in mappers
 */
export function mapMangledModule<S extends PropertyKey>(code: string | string[], mappers: Record<S, FilterFn>) {
    const result = find<Record<S, ModuleExports>>(filters.byFactoryCode(...Array.isArray(code) ? code : [code]), exports => {
        const mapping = {} as Record<S, ModuleExports>;

        outer:
        for (const newName in mappers) {
            const filter = mappers[newName];

            if (typeof exports === "object") {
                for (const exportKey in exports) {
                    const exportValue = exports[exportKey];

                    if (exportValue != null && filter(exportValue)) {
                        mapping[newName] = exportValue;
                        continue outer;
                    }
                }
            }

            const [proxy] = proxyInner(`Webpack mapMangledModule mapper filter matched no module. Filter: ${printFilter(filter)}`, "Webpack find with proxy called on a primitive value. This can happen if you try to destructure a primitive in the top level definition of the find.");
            // Use the proxy to throw errors because no export matched the filter
            mapping[newName] = proxy;
        }

        return mapping;
    }, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["mapMangledModule", [result, code, mappers]]);
    }

    return result;
}

export type CacheFindResult = {
    /** The find result. `undefined` if nothing was found */
    result?: ModuleExports;
    /** The id of the module exporting where the result was found. `undefined` if nothing was found */
    id?: PropertyKey;
    /** The key exporting the result. `null` if the find result was all the module exports, `undefined` if nothing was found */
    exportKey?: PropertyKey | null;
    /** The factory of the module exporting the result. `undefined` if nothing was found */
    factory?: AnyModuleFactory;
};

/**
 * Find the first export or module exports from an already required module that matches the filter.
 *
 * @param filter A function that takes an export or module exports and returns a boolean
 */
export const _cacheFind = traceFunction("cacheFind", function _cacheFind(filter: FilterFn): CacheFindResult {
    if (typeof filter !== "function")
        throw new Error("Invalid filter. Expected a function got " + typeof filter);

    for (const key in cache) {
        const mod = cache[key];
        if (!mod?.loaded || mod?.exports == null) continue;

        if (filter.$$vencordIsFactoryFilter && filter(wreq.m[key])) {
            return { result: mod.exports, id: key, exportKey: null, factory: wreq.m[key] as AnyModuleFactory };
        }

        if (filter(mod.exports)) {
            return { result: mod.exports, id: key, exportKey: null, factory: wreq.m[key] as AnyModuleFactory };
        }

        if (typeof mod.exports !== "object") {
            continue;
        }

        if (mod.exports.default != null && filter(mod.exports.default)) {
            return { result: mod.exports.default, id: key, exportKey: "default ", factory: wreq.m[key] as AnyModuleFactory };
        }

        for (const exportKey in mod.exports) if (exportKey.length <= 3) {
            const exportValue = mod.exports[exportKey];

            if (exportValue != null && filter(exportValue)) {
                return { result: exportValue, id: key, exportKey, factory: wreq.m[key] as AnyModuleFactory };
            }
        }
    }

    return {};
});

/**
 * Find the first export or module exports from an already required module that matches the filter.
 *
 * @param filter A function that takes an export or module exports and returns a boolean
 * @returns The found export or module exports, or undefined
 */
export function cacheFind(filter: FilterFn) {
    const cacheFindResult = _cacheFind(filter);

    return cacheFindResult.result;
}

/**
 * Find the the export or module exports from an all the required modules that match the filter.
 *
 * @param filter A function that takes an export or module exports and returns a boolean
 * @returns An array of all the found export or module exports
 */
export function cacheFindAll(filter: FilterFn) {
    if (typeof filter !== "function")
        throw new Error("Invalid filter. Expected a function got " + typeof filter);

    const ret: ModuleExports[] = [];
    for (const key in cache) {
        const mod = cache[key];
        if (!mod?.loaded || mod?.exports == null) continue;

        if (filter.$$vencordIsFactoryFilter && filter(wreq.m[key])) {
            ret.push(mod.exports);
        }

        if (filter(mod.exports)) {
            ret.push(mod.exports);
        }

        if (typeof mod.exports !== "object") {
            continue;
        }

        if (mod.exports.default != null && filter(mod.exports.default)) {
            ret.push(mod.exports.default);
        }

        for (const exportKey in mod.exports) if (exportKey.length <= 3) {
            const exportValue = mod.exports[exportKey];

            if (exportValue != null && filter(exportValue)) {
                ret.push(exportValue);
                break;
            }
        }
    }

    return ret;
}

/**
 * Same as {@link cacheFind} but in bulk.
 *
 * @param filterFns Array of filters
 * @returns Array of results in the same order as the passed filters
 */
export const cacheFindBulk = traceFunction("cacheFindBulk", function cacheFindBulk(...filterFns: FilterFn[]) {
    if (!Array.isArray(filterFns)) {
        throw new Error("Invalid filters. Expected function[] got " + typeof filterFns);
    }

    const { length } = filterFns;

    if (length === 0) {
        throw new Error("Expected at least two filters.");
    }

    if (length === 1) {
        if (IS_DEV) {
            throw new Error("bulk called with only one filter. Use find");
        }

        return [cacheFind(filterFns[0])];
    }

    let found = 0;
    const results: ModuleExports[] = Array(length);

    const filters = [...filterFns] as Array<FilterFn | undefined>;

    outer:
    for (const key in cache) {
        const mod = cache[key];
        if (!mod?.loaded || mod?.exports == null) continue;

        for (let i = 0; i < length; i++) {
            const filter = filters[i];
            if (filter == null) continue;

            if (filter.$$vencordIsFactoryFilter && filter(wreq.m[key])) {
                results[i] = mod.exports;
                filters[i] = undefined;

                if (++found === length) break outer;
                break;
            }

            if (filter(mod.exports)) {
                results[i] = mod.exports;
                filters[i] = undefined;

                if (++found === length) break outer;
                break;
            }

            if (typeof mod.exports !== "object") {
                break;
            }

            if (mod.exports.default != null && filter(mod.exports.default)) {
                results[i] = mod.exports.default;
                filters[i] = undefined;

                if (++found === length) break outer;
                continue;
            }

            for (const exportKey in mod.exports) if (exportKey.length <= 3) {
                const exportValue = mod.exports[exportKey];

                if (exportValue != null && filter(mod.exports[key])) {
                    results[i] = exportValue;
                    filters[i] = undefined;

                    if (++found === length) break outer;
                    break;
                }
            }
        }
    }

    if (found !== length) {
        const err = new Error(`Got ${length} filters, but only found ${found} modules!`);

        if (!IS_DEV || devToolsOpen) {
            logger.warn(err);
            return null;
        } else {
            throw err; // Strict behaviour in DevBuilds to fail early and make sure the issue is found
        }
    }

    return results;
});

/**
 * Find the id of the first already loaded module factory that includes all the given code.
 */
export const cacheFindModuleId = traceFunction("cacheFindModuleId", function cacheFindModuleId(...code: string[]) {
    outer:
    for (const id in wreq.m) {
        const str = String(wreq.m[id]);

        for (const c of code) {
            if (!str.includes(c)) continue outer;
        }

        return id;
    }

    const err = new Error("Didn't find module with code(s):\n" + code.join("\n"));

    if (!IS_DEV || devToolsOpen) {
        logger.warn(err);
    } else {
        throw err; // Strict behaviour in DevBuilds to fail early and make sure the issue is found
    }
});

/**
 * Find the first already loaded module factory that includes all the given code.
 */
export function cacheFindModuleFactory(...code: string[]) {
    const id = cacheFindModuleId(...code);
    if (id == null) return;

    return wreq.m[id];
}

/**
 * This is just a wrapper around {@link proxyLazy} to make our reporter test for your webpack finds.
 *
 * Wraps the result of factory in a Proxy you can consume as if it wasn't lazy.
 * On first property access, the factory is evaluated.
 *
 * @param factory Factory returning the result
 * @param attempts How many times to try to evaluate the factory before giving up
 * @returns Result of factory function
 */
export function webpackDependantLazy<T = AnyObject>(factory: () => T, attempts?: number) {
    if (IS_REPORTER) webpackSearchHistory.push(["webpackDependantLazy", [factory]]);

    return proxyLazy<T>(factory, attempts);
}

/**
 * This is just a wrapper around {@link LazyComponent} to make our reporter test for your webpack finds.
 *
 * A lazy component. The factory method is called on first render.
 *
 * @param factory Function returning a Component
 * @param attempts How many times to try to get the component before giving up
 * @returns Result of factory function
 */
export function webpackDependantLazyComponent<T extends object = any>(factory: () => any, attempts?: number) {
    if (IS_REPORTER) webpackSearchHistory.push(["webpackDependantLazyComponent", [factory]]);

    return LazyComponent<T>(factory, attempts);
}

export const DefaultExtractAndLoadChunksRegex = /(?:(?:Promise\.all\(\[)?(\i\.e\("?[^)]+?"?\)[^\]]*?)(?:\]\))?|Promise\.resolve\(\))\.then\(\i\.bind\(\i,"?([^)]+?)"?\)\)/;
export const ChunkIdsRegex = /\("([^"]+?)"\)/g;

/**
 * Extract and load chunks using their entry point.
 *
 * @param code The code or list of code the module factory containing the lazy chunk loading must include
 * @param matcher A RegExp that returns the chunk ids array as the first capture group and the entry point id as the second. Defaults to a matcher that captures the first lazy chunk loading found in the module factory
 * @returns A function that returns a promise that resolves with a boolean whether the chunks were loaded, on first call
 */
export function extractAndLoadChunksLazy(code: string | string[], matcher: RegExp = DefaultExtractAndLoadChunksRegex) {
    const module = findModuleFactory(...Array.isArray(code) ? code : [code]);

    const extractAndLoadChunks = makeLazy(async () => {
        if (module[SYM_PROXY_INNER_VALUE] == null) {
            const err = new Error("extractAndLoadChunks: Couldn't find module factory");

            if (!IS_DEV || devToolsOpen) {
                logger.warn(err, "Code:", code, "Matcher:", matcher);
                return false;
            } else {
                throw err; // Strict behaviour in DevBuilds to fail early and make sure the issue is found
            }
        }

        const match = String(module).match(canonicalizeMatch(matcher));
        if (!match) {
            const err = new Error("extractAndLoadChunks: Couldn't find chunk loading in module factory code");

            if (!IS_DEV || devToolsOpen) {
                logger.warn(err, "Code:", code, "Matcher:", matcher);
                return false;
            } else {
                throw err; // Strict behaviour in DevBuilds to fail early and make sure the issue is found
            }
        }

        const [, rawChunkIds, entryPointId] = match;
        if (Number.isNaN(Number(entryPointId))) {
            const err = new Error("extractAndLoadChunks: Matcher didn't return a capturing group with the chunk ids array, or the entry point id returned as the second group wasn't a number");

            if (!IS_DEV || devToolsOpen) {
                logger.warn(err, "Code:", code, "Matcher:", matcher);
                return false;
            } else {
                throw err; // Strict behaviour in DevBuilds to fail early and make sure the issue is found
            }
        }

        if (rawChunkIds) {
            const chunkIds = Array.from(rawChunkIds.matchAll(ChunkIdsRegex)).map((m: any) => m[1]);
            await Promise.all(chunkIds.map(id => wreq.e(id)));
        }

        if (wreq.m[entryPointId] == null) {
            const err = new Error("extractAndLoadChunks: Entry point is not loaded in the module factories, perhaps one of the chunks failed to load");

            if (!IS_DEV || devToolsOpen) {
                logger.warn(err, "Code:", code, "Matcher:", matcher);
                return false;
            } else {
                throw err; // Strict behaviour in DevBuilds to fail early and make sure the issue is found
            }
        }

        wreq(entryPointId as any);
        return true;
    });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["extractAndLoadChunks", [extractAndLoadChunks, code, matcher]]);
    }

    return extractAndLoadChunks;
}

function deprecatedRedirect<T extends (...args: any[]) => any>(oldMethod: string, newMethod: string, redirect: T): T {
    return ((...args: Parameters<T>) => {
        logger.warn(`Method ${oldMethod} is deprecated. Use ${newMethod} instead. For more information read https://github.com/Vendicated/Vencord/pull/2409#issue-2277161516`);
        return redirect(...args);
    }) as T;
}

/**
 * @deprecated Use {@link webpackDependantLazy} instead
 *
 * This is just a wrapper around {@link proxyLazy} to make our reporter test for your webpack finds.
 *
 * Wraps the result of factory in a Proxy you can consume as if it wasn't lazy.
 * On first property access, the factory is evaluated.
 *
 * @param factory Factory returning the result
 * @param attempts How many times to try to evaluate the factory before giving up
 * @returns Result of factory function
 */
export const proxyLazyWebpack = deprecatedRedirect("proxyLazyWebpack", "webpackDependantLazy", webpackDependantLazy);

/**
 * @deprecated Use {@link webpackDependantLazyComponent} instead
 *
 * This is just a wrapper around {@link LazyComponent} to make our reporter test for your webpack finds.
 *
 * A lazy component. The factory method is called on first render.
 *
 * @param factory Function returning a Component
 * @param attempts How many times to try to get the component before giving up
 * @returns Result of factory function
 */
export const LazyComponentWebpack = deprecatedRedirect("LazyComponentWebpack", "webpackDependantLazyComponent", webpackDependantLazyComponent);

/**
 * @deprecated Use {@link find} instead
 *
 * Find the first module that matches the filter, lazily
 */
export const findLazy = deprecatedRedirect("findLazy", "find", find);

/**
 * @deprecated Use {@link findByProps} instead
 *
 * Find the first module that has the specified properties, lazily
 */
export const findByPropsLazy = deprecatedRedirect("findByPropsLazy", "findByProps", findByProps);


/**
 * @deprecated Use {@link findByCode} instead
 *
 * Find the first function that includes all the given code, lazily
 */
export const findByCodeLazy = deprecatedRedirect("findByCodeLazy", "findByCode", findByCode);

/**
 * @deprecated Use {@link findStore} instead
 *
 * Find a store by its displayName, lazily
 */
export const findStoreLazy = deprecatedRedirect("findStoreLazy", "findStore", findStore);

/**
 * @deprecated Use {@link findComponent} instead
 *
 * Finds the first component that matches the filter, lazily.
 */
export const findComponentLazy = deprecatedRedirect("findComponentLazy", "findComponent", findComponent);

/**
 * @deprecated Use {@link findComponentByCode} instead
 *
 * Finds the first component that includes all the given code, lazily
 */
export const findComponentByCodeLazy = deprecatedRedirect("findComponentByCodeLazy", "findComponentByCode", findComponentByCode);

/**
 * @deprecated Use {@link findExportedComponent} instead
 *
 * Finds the first component that is exported by the first prop name, lazily
 */
export const findExportedComponentLazy = deprecatedRedirect("findExportedComponentLazy", "findExportedComponent", findExportedComponent);

/**
 * @deprecated Use {@link mapMangledModule} instead
 *
 * {@link mapMangledModule}, lazy.
 *
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
export const mapMangledModuleLazy = deprecatedRedirect("mapMangledModuleLazy", "mapMangledModule", mapMangledModule);

/**
 * @deprecated Use {@link cacheFindAll} instead
 */
export const findAll = deprecatedRedirect("findAll", "cacheFindAll", cacheFindAll);

/**
 * @deprecated Use {@link cacheFindBulk} instead
 *
 * Same as {@link cacheFind} but in bulk
 *
 * @param filterFns Array of filters. Please note that this array will be modified in place, so if you still
 *                  need it afterwards, pass a copy.
 * @returns Array of results in the same order as the passed filters
 */
export const findBulk = deprecatedRedirect("findBulk", "cacheFindBulk", cacheFindBulk);

/**
 * @deprecated Use {@link cacheFindModuleId} instead
 *
 * Find the id of the first module factory that includes all the given code
 * @returns string or null
 */
export const findModuleId = deprecatedRedirect("findModuleId", "cacheFindModuleId", cacheFindModuleId);

/**
 * Search modules by keyword. This searches the factory methods,
 * meaning you can search all sorts of things, methodName, strings somewhere in the code, etc.
 *
 * @param filters One or more strings or regexes
 * @returns Mapping of found modules
 */
export function search(...filters: Array<string | RegExp>) {
    const results: WebpackRequire["m"] = {};
    const factories = wreq.m;
    outer:
    for (const id in factories) {
        const factory = factories[id];
        const factoryStr = String(factory);
        for (const filter of filters) {
            if (typeof filter === "string" && !factoryStr.includes(filter)) continue outer;
            if (filter instanceof RegExp && !filter.test(factoryStr)) continue outer;
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
 *
 * @param id The id of the module to extract
 */
export function extract(id: PropertyKey) {
    const factory = wreq.m[id];
    if (!factory) return null;

    const code = `
// [EXTRACTED] WebpackModule${String(id)}
// WARNING: This module was extracted to be more easily readable.
//          This module is NOT ACTUALLY USED! This means putting breakpoints will have NO EFFECT!!

0,${String(factory)}
//# sourceURL=ExtractedWebpackModule${String(id)}
`;
    const extracted: ModuleFactory = (0, eval)(code);
    return extracted;
}

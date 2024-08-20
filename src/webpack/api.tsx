/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated, Nuckyz and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeLazy, proxyLazy } from "@utils/lazy";
import { LazyComponent, LazyComponentType, SYM_LAZY_COMPONENT_INNER } from "@utils/lazyReact";
import { Logger } from "@utils/Logger";
import { canonicalizeMatch } from "@utils/patches";
import { proxyInner, SYM_PROXY_INNER_GET, SYM_PROXY_INNER_VALUE } from "@utils/proxyInner";

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

let devToolsOpen = false;
if (IS_DEV && IS_DISCORD_DESKTOP) {
    // At this point in time, DiscordNative has not been exposed yet, so setImmediate is needed
    setTimeout(() => {
        DiscordNative?.window.setDevtoolsCallbacks(() => devToolsOpen = true, () => devToolsOpen = false);
    }, 0);
}

export type PropsFilter = Array<string>;
export type CodeFilter = Array<string | RegExp>;
export type CodeFilterWithSingle = string | RegExp | CodeFilter;
export type StoreNameFilter = string;

export type FilterFn = ((module: ModuleExports) => boolean) & {
    $$vencordProps?: Array<string | RegExp>;
    $$vencordIsComponentFilter?: boolean;
    $$vencordIsFactoryFilter?: boolean;
};

export const stringMatches = (s: string, filter: CodeFilter) =>
    filter.every(f =>
        typeof f === "string"
            ? s.includes(f)
            : (f.global && (f.lastIndex = 0), f.test(s))
    );

export const filters = {
    byProps: (...props: PropsFilter): FilterFn => {
        const filter: FilterFn = props.length === 1
            ? m => m?.[props[0]] !== undefined
            : m => props.every(p => m?.[p] !== undefined);

        filter.$$vencordProps = ["byProps", ...props];
        return filter;
    },

    byCode: (...code: CodeFilter): FilterFn => {
        const parsedCode = code.map(canonicalizeMatch);
        const filter: FilterFn = m => {
            if (typeof m !== "function") return false;
            return stringMatches(String(m), parsedCode);
        };

        filter.$$vencordProps = ["byCode", ...code];
        return filter;
    },

    byStoreName: (name: StoreNameFilter): FilterFn => {
        const filter: FilterFn = m => m?.constructor?.displayName === name || m?.constructor?.persistKey === name;

        filter.$$vencordProps = ["byStoreName", name];
        return filter;
    },

    // For use inside mapMangledModule
    componentByFilter: (filter: FilterFn): FilterFn => {
        filter.$$vencordIsComponentFilter = true;
        return filter;
    },

    componentByCode: (...code: CodeFilter): FilterFn => {
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
        filter.$$vencordIsComponentFilter = true;
        return filter;
    },

    componentByFields: (...fields: PropsFilter): FilterFn => {
        const byPropsFilter = filters.byProps(...fields);
        const filter: FilterFn = m => m?.prototype?.render && byPropsFilter(m.prototype);

        filter.$$vencordProps = ["componentByFields", ...fields];
        filter.$$vencordIsComponentFilter = true;
        return filter;
    },

    byFactoryCode: (...code: CodeFilter): FilterFn => {
        const byCodeFilter = filters.byCode(...code);

        byCodeFilter.$$vencordProps = ["byFactoryCode", ...code];
        byCodeFilter.$$vencordIsFactoryFilter = true;
        return byCodeFilter;
    }
};

export const webpackSearchHistory = [] as Array<["waitFor" | "find" | "findComponent" | "findExportedComponent" | "findComponentByCode" | "findComponentByFields" | "findByProps" | "findProp" | "findByCode" | "findStore" | "findByFactoryCode" | "mapMangledModule" | "findModuleFactory" | "extractAndLoadChunks" | "webpackDependantLazy" | "webpackDependantLazyComponent", any[]]>;

function printFilter(filter: FilterFn) {
    if (filter.$$vencordProps != null) {
        const props = filter.$$vencordProps;
        return `${props[0]}(${props.slice(1).map(arg => arg instanceof RegExp ? String(arg) : JSON.stringify(arg)).join(", ")})`;
    }

    return String(filter);
}

function wrapWebpackComponent<T extends object = any>(
    errMsg: string | (() => string)
): [WrapperComponent: LazyComponentType<T>, setInnerComponent: (rawComponent: any, parsedComponent: LazyComponentType<T>) => void] {
    let InnerComponent = null as LazyComponentType<T> | null;

    let findFailedLogged = false;
    const WrapperComponent = (props: T) => {
        if (InnerComponent === null && !findFailedLogged) {
            findFailedLogged = true;
            logger.error(typeof errMsg === "string" ? errMsg : errMsg());
        }

        return InnerComponent && <InnerComponent {...props} />;
    };

    WrapperComponent[SYM_LAZY_COMPONENT_INNER] = () => InnerComponent;

    function setInnerComponent(RawComponent: any, ParsedComponent: LazyComponentType<T>) {
        InnerComponent = ParsedComponent;
        Object.assign(WrapperComponent, RawComponent);
    }

    return [WrapperComponent, setInnerComponent];
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
 * then call the parse function with the export or module exports as the first argument.
 *
 * If the module containing the export(s) is already required, the parse function will be called immediately.
 *
 * The parse function must return a value that will be used as the proxy inner value.
 *
 * If no parse function is specified, the default parse will assign the proxy inner value to the plain find result.
 *
 * @param filter A function that takes an export or module exports and returns a boolean
 * @param parse A function that takes the find result as its first argument and returns something to use as the proxy inner value. Useful if you want to use a value from the find result, instead of all of it. Defaults to the find result itself
 * @returns A proxy that has the parse function return value as its true value, or the plain parse function return value, if it was called immediately.
 */
export function find<T = any>(filter: FilterFn, parse: (module: ModuleExports) => ModuleExports = m => m, { isIndirect = false }: { isIndirect?: boolean; } = {}) {
    if (typeof filter !== "function")
        throw new Error("Invalid filter. Expected a function got " + typeof filter);
    if (typeof parse !== "function")
        throw new Error("Invalid find parse. Expected a function got " + typeof parse);

    const [proxy, setInnerValue] = proxyInner<T>(`Webpack find matched no module. Filter: ${printFilter(filter)}`, "Webpack find with proxy called on a primitive value. This can happen if you try to destructure a primitive in the top level definition of the find.");
    waitFor(filter, m => setInnerValue(parse(m)), { isIndirect: true });

    if (IS_REPORTER && !isIndirect) {
        webpackSearchHistory.push(["find", [proxy, filter]]);
    }

    if (proxy[SYM_PROXY_INNER_VALUE] != null) return proxy[SYM_PROXY_INNER_VALUE] as T;

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

    const [WrapperComponent, setInnerComponent] = wrapWebpackComponent<T>(`Webpack find matched no module. Filter: ${printFilter(filter)}`);
    waitFor(filter, m => setInnerComponent(m, parse(m)), { isIndirect: true });

    if (IS_REPORTER && !isIndirect) {
        webpackSearchHistory.push(["findComponent", [WrapperComponent, filter]]);
    }

    if (WrapperComponent[SYM_LAZY_COMPONENT_INNER]() != null) return WrapperComponent[SYM_LAZY_COMPONENT_INNER]() as LazyComponentType<T>;

    return WrapperComponent;
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
export function findExportedComponent<T extends object = any>(...props: PropsFilter | [...PropsFilter, (component: ModuleExports) => LazyComponentType<T>]) {
    const parse = (typeof props.at(-1) === "function" ? props.pop() : m => m) as (component: ModuleExports) => LazyComponentType<T>;
    const newProps = props as PropsFilter;

    const filter = filters.byProps(...newProps);

    const [WrapperComponent, setInnerComponent] = wrapWebpackComponent<T>(`Webpack find matched no module. Filter: ${printFilter(filter)}`);
    waitFor(filter, m => setInnerComponent(m[newProps[0]], parse(m[newProps[0]])), { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findExportedComponent", [WrapperComponent, ...newProps]]);
    }

    if (WrapperComponent[SYM_LAZY_COMPONENT_INNER]() != null) return WrapperComponent[SYM_LAZY_COMPONENT_INNER]() as LazyComponentType<T>;

    return WrapperComponent;
}

/**
 * Find the first exported component which when its code is stringified includes all the given code.
 *
 * @example findComponentByCode(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR")
 * @example findComponentByCode(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)", ColorPicker => React.memo(ColorPicker))
 *
 * @param code A list of code to search each export for
 * @param parse A function that takes the found component as its first argument and returns a component. Useful if you want to wrap the found component in something. Defaults to the original component
 * @returns The component if found, or a noop component
 */
export function findComponentByCode<T extends object = any>(...code: CodeFilter | [...CodeFilter, (component: ModuleExports) => LazyComponentType<T>]) {
    const parse = (typeof code.at(-1) === "function" ? code.pop() : m => m) as (component: ModuleExports) => LazyComponentType<T>;
    const newCode = code as CodeFilter;

    const ComponentResult = findComponent<T>(filters.componentByCode(...newCode), parse, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findComponentByCode", [ComponentResult, ...newCode]]);
    }

    return ComponentResult;
}

/**
 * Find the first exported class component which includes all the given fields in its prototype.
 *
 * @example findComponentByFields("renderTooltip", "shouldShowTooltip")
 * @example findComponentByFields("renderTooltip", "shouldShowTooltip", Tooltip => Tooltip)
 *
 * @param code A list of fields to search each exported class component for
 * @param parse A function that takes the found component as its first argument and returns a component. Useful if you want to wrap the found component in something. Defaults to the original component
 * @returns The component if found, or a noop component
 */
export function findComponentByFields<T extends object = any>(...fields: PropsFilter | [...PropsFilter, (component: ModuleExports) => LazyComponentType<T>]) {
    const parse = (typeof fields.at(-1) === "function" ? fields.pop() : m => m) as (component: ModuleExports) => LazyComponentType<T>;
    const newFields = fields as PropsFilter;

    const ComponentResult = findComponent<T>(filters.componentByFields(...newFields), parse, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findComponentByCode", [ComponentResult, ...newFields]]);
    }

    return ComponentResult;
}

/**
 * Find the first module exports or export that includes all the given props.
 *
 * @param props A list of props to search the module or exports for
 * @param parse A function that takes the find result as its first argument and returns something. Useful if you want to use a value from the find result, instead of all of it. Defaults to the find result itself
 */
export function findByProps<T = any>(...props: PropsFilter | [...PropsFilter, (module: ModuleExports) => T]) {
    const parse = (typeof props.at(-1) === "function" ? props.pop() : m => m) as (module: ModuleExports) => T;
    const newProps = props as PropsFilter;

    const result = find<T>(filters.byProps(...newProps), parse, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findByProps", [result, ...newProps]]);
    }

    return result;
}

/**
 * Find the first prop value defined by the first prop name, which is in a module exports or export including all the given props.
 *
 * @example const getUser = findProp("getUser", "fetchUser")
 * // An object which contains the getUser and fetchUser props is found and the value of getUser is returned
 *
 * @param props A list of props to search the module or exports for
 * @param parse A function that takes the find result as its first argument and returns something. Useful if you want to use a value from the find result, instead of all of it. Defaults to the find result itself
 */
export function findProp<T = any>(...props: PropsFilter | [...PropsFilter, (module: ModuleExports) => T]) {
    const parse = (typeof props.at(-1) === "function" ? props.pop() : m => m) as (module: ModuleExports) => T;
    const newProps = props as PropsFilter;

    const result = find<T>(filters.byProps(...newProps), m => parse(m[newProps[0]]), { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findProp", [result, ...newProps]]);
    }

    return result;
}

/**
 * Find the first exported function which when stringified includes all the given code.
 *
 * @param code A list of code to search each export for
 * @param parse A function that takes the find result as its first argument and returns something. Useful if you want to use a value from the find result, instead of all of it. Defaults to the find result itself
 */
export function findByCode<T = any>(...code: CodeFilter | [...CodeFilter, (module: ModuleExports) => T]) {
    const parse = (typeof code.at(-1) === "function" ? code.pop() : m => m) as (module: ModuleExports) => T;
    const newCode = code as CodeFilter;

    const result = find<T>(filters.byCode(...newCode), parse, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findByCode", [result, ...newCode]]);
    }

    return result;
}

/**
 * Find a store by its name.
 *
 * @param name The store name
 */
export function findStore<T = GenericStore>(name: StoreNameFilter) {
    const result = find<T>(filters.byStoreName(name), m => m, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findStore", [result, name]]);
    }

    return result;
}

/**
 * Find the module exports of the first module which the factory when stringified includes all the given code.
 *
 * @param code A list of code to search each factory for
 * @param parse A function that takes the find result as its first argument and returns something. Useful if you want to use a value from the find result, instead of all of it. Defaults to the find result itself
 */
export function findByFactoryCode<T = any>(...code: CodeFilter | [...CodeFilter, (module: ModuleExports) => T]) {
    const parse = (typeof code.at(-1) === "function" ? code.pop() : m => m) as (module: ModuleExports) => T;
    const newCode = code as CodeFilter;

    const result = find<T>(filters.byFactoryCode(...newCode), parse, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["findByFactoryCode", [result, ...newCode]]);
    }

    return result;
}

/**
 * Find the module exports of the first module which the factory when stringified includes all the given code,
 * then map them into an easily usable object via the specified mappers.
 *
 * IMPORTANT: You can destructure the properties of the returned object at top level as long as the property filter does not return a primitive value export.
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
export function mapMangledModule<S extends PropertyKey>(code: CodeFilterWithSingle, mappers: Record<S, FilterFn>) {
    const mapping = {} as Record<S, any>;
    const proxyInnerSetters = {} as Record<S, ReturnType<typeof proxyInner>[1]>;
    const wrapperComponentSetters = {} as Record<S, ReturnType<typeof wrapWebpackComponent>[1]>;

    for (const newName in mappers) {
        const mapperFilter = mappers[newName];

        // Wrapper to select whether the parent factory filter or child mapper filter failed when the error is thrown
        const errorMsgWrapper = () => `Webpack mapMangledModule ${callbackCalled ? "mapper" : "factory"} filter matched no module. Filter: ${printFilter(callbackCalled ? mapperFilter : factoryFilter)}`;

        if (mapperFilter.$$vencordIsComponentFilter) {
            const [WrapperComponent, setInnerComponent] = wrapWebpackComponent(errorMsgWrapper);
            mapping[newName] = WrapperComponent;
            wrapperComponentSetters[newName] = setInnerComponent;
        } else {
            const [proxy, setInnerValue] = proxyInner(errorMsgWrapper, "Webpack find with proxy called on a primitive value. This may happen if you are trying to destructure a mapMangledModule primitive value on top level.");
            mapping[newName] = proxy;
            proxyInnerSetters[newName] = setInnerValue;
        }
    }

    const factoryFilter = filters.byFactoryCode(...Array.isArray(code) ? code : [code]);

    let callbackCalled = false;
    waitFor(factoryFilter, exports => {
        callbackCalled = true;

        if (typeof exports !== "object") return;

        for (const exportKey in exports) {
            const exportValue = exports[exportKey];
            if (exportValue == null) continue;

            for (const newName in mappers) {
                const filter = mappers[newName];

                if (filter(exportValue)) {
                    if (typeof exportValue !== "object" && typeof exportValue !== "function") {
                        mapping[newName] = exportValue;
                    }

                    if (filter.$$vencordIsComponentFilter) {
                        wrapperComponentSetters[newName](exportValue, exportValue);
                    } else {
                        proxyInnerSetters[newName](exportValue);
                    }
                }
            }
        }
    }, { isIndirect: true });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["mapMangledModule", [mapping, code, mappers]]);
    }

    if (callbackCalled) {
        for (const innerMap in mapping) {
            const innerValue = mapping[innerMap];

            if (innerValue[SYM_PROXY_INNER_VALUE] != null) {
                mapping[innerMap] = innerValue[SYM_PROXY_INNER_VALUE];
            } else if (innerValue[SYM_LAZY_COMPONENT_INNER] != null && innerValue[SYM_LAZY_COMPONENT_INNER]() != null) {
                mapping[innerMap] = innerValue[SYM_LAZY_COMPONENT_INNER]();
            }
        }
    }

    return mapping;
}

/**
 * Find the first module factory which when stringified includes all the given code.
 */
export function findModuleFactory(code: CodeFilterWithSingle, { isIndirect = false }: { isIndirect?: boolean; } = {}) {
    const filter = filters.byFactoryCode(...Array.isArray(code) ? code : [code]);

    const [proxy, setInnerValue] = proxyInner<AnyModuleFactory>(`Webpack module factory find matched no module. Filter: ${printFilter(filter)}`, "Webpack find with proxy called on a primitive value. This can happen if you try to destructure a primitive in the top level definition of the find.");
    waitFor(filter, (_, { factory }) => setInnerValue(factory));

    if (IS_REPORTER && !isIndirect) {
        webpackSearchHistory.push(["findModuleFactory", [proxy, code]]);
    }

    if (proxy[SYM_PROXY_INNER_VALUE] != null) return proxy[SYM_PROXY_INNER_VALUE] as AnyModuleFactory;

    return proxy;
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
export function webpackDependantLazy<T = any>(factory: () => T, attempts?: number) {
    if (IS_REPORTER) webpackSearchHistory.push(["webpackDependantLazy", [factory]]);

    return proxyLazy<T>(factory, attempts, `Webpack dependant lazy factory failed:\n${factory}`, "Webpack dependant lazy called on a primitive value. This can happen if you try to destructure a primitive in the top level definition of the lazy.");
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

    return LazyComponent<T>(factory, attempts, `Webpack dependant LazyComponent factory failed:\n${factory}`);
}

export const DefaultExtractAndLoadChunksRegex = /(?:(?:Promise\.all\(\[)?(\i\.e\("?[^)]+?"?\)[^\]]*?)(?:\]\))?|Promise\.resolve\(\))\.then\(\i\.bind\(\i,"?([^)]+?)"?\)\)/;
export const ChunkIdsRegex = /\("([^"]+?)"\)/g;

function handleWebpackError(err: string, returnValue: any, ...args: any[]) {
    if (!IS_DEV || devToolsOpen) {
        logger.warn(err, ...args);
        return returnValue;
    }

    throw new Error(err); // Throw the error in development if devtools are closed
}

/**
 * Extract and load chunks using their entry point.
 *
 * @param code The code or list of code the module factory containing the lazy chunk loading must include
 * @param matcher A RegExp that returns the chunk ids array as the first capture group and the entry point id as the second. Defaults to a matcher that captures the first lazy chunk loading found in the module factory
 * @returns A function that returns a promise that resolves with a boolean whether the chunks were loaded, on first call
 */
export function extractAndLoadChunksLazy(code: CodeFilterWithSingle, matcher: RegExp = DefaultExtractAndLoadChunksRegex) {
    const module = findModuleFactory(code, { isIndirect: true });

    const extractAndLoadChunks = makeLazy(async () => {
        if (module[SYM_PROXY_INNER_GET] != null && module[SYM_PROXY_INNER_VALUE] == null) {
            return handleWebpackError("extractAndLoadChunks: Couldn't find module factory", false, "Code:", code, "Matcher:", matcher);
        }

        const match = String(module).match(canonicalizeMatch(matcher));
        if (!match) {
            return handleWebpackError("extractAndLoadChunks: Couldn't find chunk loading in module factory code", false, "Code:", code, "Matcher:", matcher);
        }

        const [, rawChunkIds, entryPointId] = match;
        if (Number.isNaN(Number(entryPointId))) {
            return handleWebpackError("extractAndLoadChunks: Matcher didn't return a capturing group with the chunk ids array, or the entry point id returned as the second group wasn't a number", false, "Code:", code, "Matcher:", matcher);
        }

        if (rawChunkIds) {
            const chunkIds = Array.from(rawChunkIds.matchAll(ChunkIdsRegex)).map(m => Number(m[1]));
            await Promise.all(chunkIds.map(id => wreq.e(id)));
        }

        if (wreq.m[entryPointId] == null) {
            return handleWebpackError("extractAndLoadChunks: Entry point is not loaded in the module factories, perhaps one of the chunks failed to load", false, "Code:", code, "Matcher:", matcher);
        }

        wreq(Number(entryPointId));
        return true;
    });

    if (IS_REPORTER) {
        webpackSearchHistory.push(["extractAndLoadChunks", [extractAndLoadChunks, code, matcher]]);
    }

    return extractAndLoadChunks;
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
    if (typeof filter !== "function") {
        throw new Error("Invalid filter. Expected a function got " + typeof filter);
    }

    for (const key in cache) {
        const mod = cache[key];
        if (!mod?.loaded || mod?.exports == null) continue;

        if (filter.$$vencordIsFactoryFilter) {
            if (filter(wreq.m[key])) {
                return { result: mod.exports, id: key, exportKey: null, factory: wreq.m[key] as AnyModuleFactory };
            }

            continue;
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
    if (typeof filter !== "function") {
        throw new Error("Invalid filter. Expected a function got " + typeof filter);
    }

    const ret: ModuleExports[] = [];
    for (const key in cache) {
        const mod = cache[key];
        if (!mod?.loaded || mod?.exports == null) continue;

        if (filter.$$vencordIsFactoryFilter) {
            if (filter(wreq.m[key])) {
                ret.push(mod.exports);
            }

            continue;
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
 * Find the id of the first already loaded module factory that includes all the given code.
 */
export const cacheFindModuleId = traceFunction("cacheFindModuleId", function cacheFindModuleId(...code: CodeFilter) {
    const parsedCode = code.map(canonicalizeMatch);

    for (const id in wreq.m) {
        if (stringMatches(String(wreq.m[id]), parsedCode)) {
            return id;
        }
    }
});

/**
 * Search modules by keyword. This searches the factory methods,
 * meaning you can search all sorts of things, methodName, strings somewhere in the code, etc.
 *
 * @param code One or more strings or regexes
 * @returns Mapping of found modules
 */
export function search(...code: CodeFilter) {
    code = code.map(canonicalizeMatch);

    const results: WebpackRequire["m"] = {};
    const factories = wreq.m;

    for (const id in factories) {
        const factory = factories[id];

        if (stringMatches(String(factory), code)) {
            results[id] = factory;
        }
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

/**
 * @deprecated Use separate finds instead
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

            if (filter.$$vencordIsFactoryFilter) {
                if (filter(wreq.m[key])) {
                    results[i] = mod.exports;
                    filters[i] = undefined;

                    if (++found === length) break outer;
                }

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

    return results;
});

/**
 * @deprecated use {@link findModuleFactory} instead
 * Find the first already loaded module factory that includes all the given code.
 */
export const cacheFindModuleFactory = traceFunction("cacheFindModuleFactory", function cacheFindModuleFactory(...code: CodeFilter) {
    const id = cacheFindModuleId(...code);
    if (id == null) return;

    return wreq.m[id];
});

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

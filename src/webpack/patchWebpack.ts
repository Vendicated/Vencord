/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated, Nuckyz, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { makeLazy } from "@utils/lazy";
import { Logger } from "@utils/Logger";
import { interpolateIfDefined } from "@utils/misc";
import { canonicalizeReplacement } from "@utils/patches";
import { Patch, PatchReplacement } from "@utils/types";

import { traceFunctionWithResults } from "../debug/Tracer";
import { _initWebpack, _shouldIgnoreModule, factoryListeners, findModuleId, moduleListeners, waitForSubscriptions, wreq } from "./webpack";
import { AnyModuleFactory, AnyWebpackRequire, MaybePatchedModuleFactory, ModuleExports, PatchedModuleFactory, WebpackRequire } from "./wreq.d";

export const patches = [] as Patch[];

export const SYM_ORIGINAL_FACTORY = Symbol("WebpackPatcher.originalFactory");
export const SYM_PATCHED_SOURCE = Symbol("WebpackPatcher.patchedSource");
export const SYM_PATCHED_BY = Symbol("WebpackPatcher.patchedBy");
export const allWebpackInstances = new Set<AnyWebpackRequire>();

export const patchTimings = [] as Array<[plugin: string, moduleId: PropertyKey, match: PatchReplacement["match"], totalTime: number]>;

export const getBuildNumber = makeLazy(() => {
    try {
        try {
            if (wreq.m[128014]?.toString().includes("Trying to open a changelog for an invalid build number")) {
                const hardcodedGetBuildNumber = wreq(128014).b as () => number;

                if (typeof hardcodedGetBuildNumber === "function" && typeof hardcodedGetBuildNumber() === "number") {
                    return hardcodedGetBuildNumber();
                }
            }
        } catch { }

        const moduleId = findModuleId("Trying to open a changelog for an invalid build number");
        if (moduleId == null) {
            return -1;
        }

        const exports = Object.values<ModuleExports>(wreq(moduleId));
        if (exports.length !== 1 || typeof exports[0] !== "function") {
            return -1;
        }

        const buildNumber = exports[0]();
        return typeof buildNumber === "number" ? buildNumber : -1;
    } catch {
        return -1;
    }
});

export function getFactoryPatchedSource(moduleId: PropertyKey, webpackRequire = wreq as AnyWebpackRequire) {
    return webpackRequire.m[moduleId]?.[SYM_PATCHED_SOURCE];
}

export function getFactoryPatchedBy(moduleId: PropertyKey, webpackRequire = wreq as AnyWebpackRequire) {
    return webpackRequire.m[moduleId]?.[SYM_PATCHED_BY];
}

const logger = new Logger("WebpackInterceptor", "#8caaee");

/** Whether we tried to fallback to the WebpackRequire of the factory, or disabled patches */
let wreqFallbackApplied = false;

const define: typeof Reflect.defineProperty = (target, p, attributes) => {
    if (Object.hasOwn(attributes, "value")) {
        attributes.writable = true;
    }

    return Reflect.defineProperty(target, p, {
        configurable: true,
        enumerable: true,
        ...attributes
    });
};

// wreq.m is the Webpack object containing module factories. It is pre-populated with factories, and is also populated via webpackGlobal.push
// We use this setter to intercept when wreq.m is defined and apply patching to its factories.

// Factories can be patched in two ways. Eagerly or lazily.
// If we are patching eagerly, pre-populated factories are patched immediately and new factories are patched when set.
// Else, we only patch them when called.

// Factories are always wrapped in a proxy, which allows us to intercept the call to them, patch if they werent eagerly patched,
// and call them with our wrapper which notifies our listeners.

// wreq.m is also wrapped in a proxy to intercept when new factories are set, patch them eargely, if enabled, and wrap them in the factory proxy.

// If this is the main Webpack, we also set up the internal references to WebpackRequire.
define(Function.prototype, "m", {
    enumerable: false,

    set(this: AnyWebpackRequire, originalModules: AnyWebpackRequire["m"]) {
        define(this, "m", { value: originalModules });

        // Ensure this is one of Discord main Webpack instances.
        // We may catch Discord bundled libs, React Devtools or other extensions Webpack instances here.
        const { stack } = new Error();
        if (!stack?.includes("http") || stack.match(/at \d+? \(/) || !String(this).includes("exports:{}")) {
            return;
        }

        const fileName = stack.match(/\/assets\/(.+?\.js)/)?.[1];
        logger.info("Found Webpack module factories" + interpolateIfDefined` in ${fileName}`);

        allWebpackInstances.add(this);

        // Define a setter for the ensureChunk property of WebpackRequire. Only the main Webpack (which is the only that includes chunk loading) has this property.
        // So if the setter is called, this means we can initialize the internal references to WebpackRequire.
        define(this, "e", {
            enumerable: false,

            set(this: WebpackRequire, ensureChunk: WebpackRequire["e"]) {
                define(this, "e", { value: ensureChunk });
                clearTimeout(setterTimeout);

                logger.info("Main WebpackInstance found" + interpolateIfDefined` in ${fileName}` + ", initializing internal references to WebpackRequire");
                _initWebpack(this);
            }
        });
        // setImmediate to clear this property setter if this is not the main Webpack.
        // If this is the main Webpack, wreq.e will always be set before the timeout runs.
        const setterTimeout = setTimeout(() => Reflect.deleteProperty(this, "e"), 0);

        // Patch the pre-populated factories
        for (const moduleId in originalModules) {
            const originalFactory = originalModules[moduleId];

            if (updateExistingFactory(originalModules, moduleId, originalFactory, originalModules, true)) {
                continue;
            }

            notifyFactoryListeners(moduleId, originalFactory);

            const proxiedFactory = new Proxy(Settings.eagerPatches ? patchFactory(moduleId, originalFactory) : originalFactory, moduleFactoryHandler);
            define(originalModules, moduleId, { value: proxiedFactory });
        }

        define(originalModules, Symbol.toStringTag, {
            value: "ModuleFactories",
            enumerable: false
        });

        const proxiedModuleFactories = new Proxy(originalModules, moduleFactoriesHandler);
        /*
        If Webpack ever decides to set module factories using the variable of the modules object directly, instead of wreq.m, switch the proxy to the prototype
        Reflect.setPrototypeOf(originalModules, new Proxy(originalModules, moduleFactoriesHandler));
        */

        define(this, "m", { value: proxiedModuleFactories });
    }
});

// The proxy for patching eagerly and/or wrapping factories in their proxy.
const moduleFactoriesHandler: ProxyHandler<AnyWebpackRequire["m"]> = {
    /*
    If Webpack ever decides to set module factories using the variable of the modules object directly instead of wreq.m, we need to switch the proxy to the prototype
    and that requires defining additional traps for keeping the object working

    // Proxies on the prototype don't intercept "get" when the property is in the object itself. But in case it isn't we need to return undefined,
    // to avoid Reflect.get having no effect and causing a stack overflow
    get(target, p, receiver) {
        return undefined;
    },
    // Same thing as get
    has(target, p) {
        return false;
    },
    */

    set(target, p, newValue, receiver) {
        if (updateExistingFactory(target, p, newValue, receiver)) {
            return true;
        }

        notifyFactoryListeners(p, newValue);

        const proxiedFactory = new Proxy(Settings.eagerPatches ? patchFactory(p, newValue) : newValue, moduleFactoryHandler);
        return Reflect.set(target, p, proxiedFactory, receiver);
    }
};

// The proxy for patching lazily and/or running factories with our wrapper.
const moduleFactoryHandler: ProxyHandler<MaybePatchedModuleFactory> = {
    apply(target, thisArg: unknown, argArray: Parameters<AnyModuleFactory>) {
        // SAFETY: Factories have `name` as their key in the module factories object, and that is always their module id
        const moduleId = target.name;

        // SYM_ORIGINAL_FACTORY means the factory has already been patched
        if (target[SYM_ORIGINAL_FACTORY] != null) {
            return runFactoryWithWrap(moduleId, target as PatchedModuleFactory, thisArg, argArray);
        }

        const patchedFactory = patchFactory(moduleId, target);
        return runFactoryWithWrap(moduleId, patchedFactory, thisArg, argArray);
    },

    get(target, p, receiver) {
        if (target[SYM_ORIGINAL_FACTORY] != null && (p === SYM_PATCHED_SOURCE || p === SYM_PATCHED_BY)) {
            return Reflect.get(target[SYM_ORIGINAL_FACTORY], p, target[SYM_ORIGINAL_FACTORY]);
        }

        const v = Reflect.get(target, p, receiver);

        // Make proxied factories `toString` return their original factory `toString`
        if (p === "toString") {
            return v.bind(target[SYM_ORIGINAL_FACTORY] ?? target);
        }

        return v;
    }
};

/**
 * Update a factory that exists in any Webpack instance with a new original factory.
 *
 * @param moduleFactoriesTarget The module factories where this new original factory is being set
 * @param moduleId The id of the module
 * @param newFactory The new original factory
 * @param receiver The receiver of the new factory
 * @param ignoreExistingInTarget Whether to ignore checking if the factory already exists in the moduleFactoriesTarget
 * @returns Whether the original factory was updated, or false if it doesn't exist in any Webpack instance
 */
function updateExistingFactory(moduleFactoriesTarget: AnyWebpackRequire["m"], moduleId: PropertyKey, newFactory: AnyModuleFactory, receiver: any, ignoreExistingInTarget: boolean = false) {
    let existingFactory: TypedPropertyDescriptor<AnyModuleFactory> | undefined;
    let moduleFactoriesWithFactory: AnyWebpackRequire["m"] | undefined;
    for (const wreq of allWebpackInstances) {
        if (ignoreExistingInTarget && wreq.m === moduleFactoriesTarget) {
            continue;
        }

        if (Object.hasOwn(wreq.m, moduleId)) {
            existingFactory = Reflect.getOwnPropertyDescriptor(wreq.m, moduleId);
            moduleFactoriesWithFactory = wreq.m;
            break;
        }
    }

    if (existingFactory != null) {
        // If existingFactory exists in any Webpack instance, it's either wrapped in our proxy, or it has already been required.
        // In the case it is wrapped in our proxy, we need the Webpack instance with this new original factory to also have our proxy.
        // So, define the descriptor of the existing factory on it.
        if (moduleFactoriesWithFactory !== moduleFactoriesTarget) {
            Reflect.defineProperty(receiver, moduleId, existingFactory);
        }

        const existingFactoryValue = moduleFactoriesWithFactory![moduleId];

        // Update with the new original factory, if it does have a current original factory
        if (existingFactoryValue[SYM_ORIGINAL_FACTORY] != null) {
            existingFactoryValue[SYM_ORIGINAL_FACTORY] = newFactory;
        }

        // Persist patched source and patched by in the new original factory
        if (IS_DEV) {
            newFactory[SYM_PATCHED_SOURCE] = existingFactoryValue[SYM_PATCHED_SOURCE];
            newFactory[SYM_PATCHED_BY] = existingFactoryValue[SYM_PATCHED_BY];
        }

        return true;
    }

    return false;
}

/**
 * Notify all factory listeners.
 *
 * @param moduleId The id of the module
 * @param factory The original factory to notify for
 */
function notifyFactoryListeners(moduleId: PropertyKey, factory: AnyModuleFactory) {
    for (const factoryListener of factoryListeners) {
        try {
            factoryListener(factory, moduleId);
        } catch (err) {
            logger.error("Error in Webpack factory listener:\n", err, factoryListener);
        }
    }
}

/**
 * Run a (possibly) patched module factory with a wrapper which notifies our listeners.
 *
 * @param moduleId The id of the module
 * @param patchedFactory The (possibly) patched module factory
 * @param thisArg The `value` of the call to the factory
 * @param argArray The arguments of the call to the factory
 */
function runFactoryWithWrap(moduleId: PropertyKey, patchedFactory: PatchedModuleFactory, thisArg: unknown, argArray: Parameters<MaybePatchedModuleFactory>) {
    const originalFactory = patchedFactory[SYM_ORIGINAL_FACTORY];

    if (patchedFactory === originalFactory) {
        // @ts-expect-error Clear up ORIGINAL_FACTORY if the factory did not have any patch applied
        delete patchedFactory[SYM_ORIGINAL_FACTORY];
    }

    // Restore the original factory in all the module factories objects, discarding our proxy and allowing it to be garbage collected
    for (const wreq of allWebpackInstances) {
        define(wreq.m, moduleId, { value: originalFactory });
    }

    let [module, exports, require] = argArray;

    if (wreq == null) {
        if (!wreqFallbackApplied) {
            wreqFallbackApplied = true;

            // Make sure the require argument is actually the WebpackRequire function
            if (typeof require === "function" && require.m != null) {
                const { stack } = new Error();
                const webpackInstanceFileName = stack?.match(/\/assets\/(.+?\.js)/)?.[1];

                logger.warn(
                    "WebpackRequire was not initialized, falling back to WebpackRequire passed to the first called wrapped module factory (" +
                    `id: ${String(moduleId)}` + interpolateIfDefined`, WebpackInstance origin: ${webpackInstanceFileName}` +
                    ")"
                );

                // Could technically be wrong, but it's better than nothing
                _initWebpack(require as WebpackRequire);
            } else if (IS_DEV) {
                logger.error("WebpackRequire was not initialized, running modules without patches instead.");
                return originalFactory.apply(thisArg, argArray);
            }
        } else if (IS_DEV) {
            return originalFactory.apply(thisArg, argArray);
        }
    }

    let factoryReturn: unknown;
    try {
        factoryReturn = patchedFactory.apply(thisArg, argArray);
    } catch (err) {
        // Just re-throw Discord errors
        if (patchedFactory === originalFactory) {
            throw err;
        }

        logger.error("Error in patched module factory:\n", err);
        return originalFactory.apply(thisArg, argArray);
    }

    exports = module.exports;
    if (exports == null) {
        return factoryReturn;
    }

    if (typeof require === "function") {
        const shouldIgnoreModule = _shouldIgnoreModule(exports);

        if (shouldIgnoreModule) {
            if (require.c != null) {
                Object.defineProperty(require.c, moduleId, {
                    value: require.c[moduleId],
                    enumerable: false,
                    configurable: true,
                    writable: true
                });
            }

            return factoryReturn;
        }
    }

    for (const callback of moduleListeners) {
        try {
            callback(exports, moduleId);
        } catch (err) {
            logger.error("Error in Webpack module listener:\n", err, callback);
        }
    }

    for (const [filter, callback] of waitForSubscriptions) {
        try {
            if (filter(exports)) {
                waitForSubscriptions.delete(filter);
                callback(exports, moduleId);
                continue;
            }

            if (typeof exports !== "object") {
                continue;
            }

            for (const exportKey in exports) {
                const exportValue = exports[exportKey];

                if (exportValue != null && filter(exportValue)) {
                    waitForSubscriptions.delete(filter);
                    callback(exportValue, moduleId);
                    break;
                }
            }
        } catch (err) {
            logger.error("Error while firing callback for Webpack waitFor subscription:\n", err, filter, callback);
        }
    }

    return factoryReturn;
}

/**
 * Patches a module factory.
 *
 * @param moduleId The id of the module
 * @param originalFactory The original module factory
 * @returns The patched module factory
 */
function patchFactory(moduleId: PropertyKey, originalFactory: AnyModuleFactory): PatchedModuleFactory {
    // 0, prefix to turn it into an expression: 0,function(){} would be invalid syntax without the 0,
    let code: string = "0," + String(originalFactory);
    let patchedSource = code;
    let patchedFactory = originalFactory;

    const patchedBy = new Set<string>();

    for (let i = 0; i < patches.length; i++) {
        const patch = patches[i];

        const moduleMatches = typeof patch.find === "string"
            ? code.includes(patch.find)
            : (patch.find.global && (patch.find.lastIndex = 0), patch.find.test(code));

        if (!moduleMatches) {
            continue;
        }

        // Eager patches cannot retrieve the build number because this code runs before the module for it is loaded
        const buildNumber = Settings.eagerPatches ? -1 : getBuildNumber();
        const shouldCheckBuildNumber = !Settings.eagerPatches && buildNumber !== -1;

        if (
            shouldCheckBuildNumber &&
            (patch.fromBuild != null && buildNumber < patch.fromBuild) ||
            (patch.toBuild != null && buildNumber > patch.toBuild)
        ) {
            continue;
        }

        const executePatch = traceFunctionWithResults(`patch by ${patch.plugin}`, (match: string | RegExp, replace: string) => {
            if (typeof match !== "string" && match.global) {
                match.lastIndex = 0;
            }

            return code.replace(match, replace);
        });

        const previousCode = code;
        const previousFactory = originalFactory;
        let markedAsPatched = false;

        // We change all patch.replacement to array in plugins/index
        for (const replacement of patch.replacement as PatchReplacement[]) {
            if (
                shouldCheckBuildNumber &&
                (replacement.fromBuild != null && buildNumber < replacement.fromBuild) ||
                (replacement.toBuild != null && buildNumber > replacement.toBuild)
            ) {
                continue;
            }

            // TODO: remove once Vesktop has been updated to use addPatch
            if (patch.plugin === "Vesktop") {
                canonicalizeReplacement(replacement, "VCDP");
            }

            const lastCode = code;
            const lastFactory = originalFactory;

            try {
                const [newCode, totalTime] = executePatch(replacement.match, replacement.replace as string);

                if (IS_REPORTER) {
                    patchTimings.push([patch.plugin, moduleId, replacement.match, totalTime]);
                }

                if (newCode === code) {
                    if (!patch.noWarn) {
                        logger.warn(`Patch by ${patch.plugin} had no effect (Module id is ${String(moduleId)}): ${replacement.match}`);
                        if (IS_DEV) {
                            logger.debug("Function Source:\n", code);
                        }
                    }

                    if (patch.group) {
                        logger.warn(`Undoing patch group ${patch.find} by ${patch.plugin} because replacement ${replacement.match} had no effect`);
                        code = previousCode;
                        patchedFactory = previousFactory;

                        if (markedAsPatched) {
                            patchedBy.delete(patch.plugin);
                        }

                        break;
                    }

                    continue;
                }

                code = newCode;
                patchedSource = `// Webpack Module ${String(moduleId)} - Patched by ${[...patchedBy, patch.plugin].join(", ")}\n${newCode}\n//# sourceURL=WebpackModule${String(moduleId)}`;
                patchedFactory = (0, eval)(patchedSource);

                if (!patchedBy.has(patch.plugin)) {
                    patchedBy.add(patch.plugin);
                    markedAsPatched = true;
                }
            } catch (err) {
                logger.error(`Patch by ${patch.plugin} errored (Module id is ${String(moduleId)}): ${replacement.match}\n`, err);

                if (IS_DEV) {
                    diffErroredPatch(code, lastCode, lastCode.match(replacement.match)!);
                }

                if (markedAsPatched) {
                    patchedBy.delete(patch.plugin);
                }

                if (patch.group) {
                    logger.warn(`Undoing patch group ${patch.find} by ${patch.plugin} because replacement ${replacement.match} errored`);
                    code = previousCode;
                    patchedFactory = previousFactory;
                    break;
                }

                code = lastCode;
                patchedFactory = lastFactory;
            }
        }

        if (!patch.all) {
            patches.splice(i--, 1);
        }
    }

    patchedFactory[SYM_ORIGINAL_FACTORY] = originalFactory;

    if (IS_DEV && patchedFactory !== originalFactory) {
        originalFactory[SYM_PATCHED_SOURCE] = patchedSource;
        originalFactory[SYM_PATCHED_BY] = patchedBy;
    }

    return patchedFactory as PatchedModuleFactory;
}

function diffErroredPatch(code: string, lastCode: string, match: RegExpMatchArray) {
    const changeSize = code.length - lastCode.length;

    // Use 200 surrounding characters of context
    const start = Math.max(0, match.index! - 200);
    const end = Math.min(lastCode.length, match.index! + match[0].length + 200);
    // (changeSize may be negative)
    const endPatched = end + changeSize;

    const context = lastCode.slice(start, end);
    const patchedContext = code.slice(start, endPatched);

    // Inline require to avoid including it in !IS_DEV builds
    const diff = (require("diff") as typeof import("diff")).diffWordsWithSpace(context, patchedContext);
    let fmt = "%c %s ";
    const elements: string[] = [];
    for (const d of diff) {
        const color = d.removed
            ? "red"
            : d.added
                ? "lime"
                : "grey";
        fmt += "%c%s";
        elements.push("color:" + color, d.value);
    }

    logger.errorCustomFmt(...Logger.makeTitle("white", "Before"), context);
    logger.errorCustomFmt(...Logger.makeTitle("white", "After"), patchedContext);
    const [titleFmt, ...titleElements] = Logger.makeTitle("white", "Diff");
    logger.errorCustomFmt(titleFmt + fmt, ...titleElements, ...elements);
}

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
import { PatchReplacement } from "@utils/types";
import { reporterData } from "debug/reporterData";

import { traceFunctionWithResults } from "../debug/Tracer";
import { patches } from "../plugins";
import { _initWebpack, _shouldIgnoreModule, AnyModuleFactory, AnyWebpackRequire, factoryListeners, findModuleId, MaybeWrappedModuleFactory, ModuleExports, moduleListeners, waitForSubscriptions, WebpackRequire, WrappedModuleFactory, wreq } from ".";

export const SYM_ORIGINAL_FACTORY = Symbol("WebpackPatcher.originalFactory");
export const SYM_PATCHED_SOURCE = Symbol("WebpackPatcher.patchedSource");
export const SYM_PATCHED_BY = Symbol("WebpackPatcher.patchedBy");
/** A set with all the Webpack instances */
export const allWebpackInstances = new Set<AnyWebpackRequire>();
export const patchTimings = [] as Array<[plugin: string, moduleId: PropertyKey, match: string | RegExp, totalTime: number]>;

const logger = new Logger("WebpackInterceptor", "#8caaee");
/** Whether we tried to fallback to factory WebpackRequire, or disabled patches */
let wreqFallbackApplied = false;
/** Whether we should be patching factories.
 *
 * This should be disabled if we start searching for the module to get the build number, and then resumed once it's done.
 * */
let shouldPatchFactories = true;

export const getBuildNumber = makeLazy(() => {
    try {
        shouldPatchFactories = false;

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
    } finally {
        shouldPatchFactories = true;
    }
});

type Define = typeof Reflect.defineProperty;
const define: Define = (target, p, attributes) => {
    if (Object.hasOwn(attributes, "value")) {
        attributes.writable = true;
    }

    return Reflect.defineProperty(target, p, {
        configurable: true,
        enumerable: true,
        ...attributes
    });
};

export function getOriginalFactory(id: PropertyKey, webpackRequire = wreq as AnyWebpackRequire) {
    const moduleFactory = webpackRequire.m[id];
    return (moduleFactory?.[SYM_ORIGINAL_FACTORY] ?? moduleFactory) as AnyModuleFactory | undefined;
}

export function getFactoryPatchedSource(id: PropertyKey, webpackRequire = wreq as AnyWebpackRequire) {
    return webpackRequire.m[id]?.[SYM_PATCHED_SOURCE];
}

export function getFactoryPatchedBy(id: PropertyKey, webpackRequire = wreq as AnyWebpackRequire) {
    return webpackRequire.m[id]?.[SYM_PATCHED_BY];
}

// wreq.m is the Webpack object containing module factories. It is pre-populated with module factories, and is also populated via webpackGlobal.push
// We use this setter to intercept when wreq.m is defined and apply the patching in its module factories.
// We wrap wreq.m with our proxy, which is responsible for patching the module factories when they are set, or defining getters for the patched versions.

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
        for (const id in originalModules) {
            if (updateExistingFactory(originalModules, id, originalModules[id], true)) {
                continue;
            }

            notifyFactoryListeners(originalModules[id]);
            defineModulesFactoryGetter(id, Settings.eagerPatches && shouldPatchFactories ? wrapAndPatchFactory(id, originalModules[id]) : originalModules[id]);
        }

        define(originalModules, Symbol.toStringTag, {
            value: "ModuleFactories",
            enumerable: false
        });

        // The proxy responsible for patching the module factories when they are set, or defining getters for the patched versions
        const proxiedModuleFactories = new Proxy(originalModules, moduleFactoriesHandler);
        /*
        If Webpack ever decides to set module factories using the variable of the modules object directly, instead of wreq.m, switch the proxy to the prototype
        Reflect.setPrototypeOf(originalModules, new Proxy(originalModules, moduleFactoriesHandler));
        */

        define(this, "m", { value: proxiedModuleFactories });
    }
});

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

    // The set trap for patching or defining getters for the module factories when new module factories are loaded
    set(target, p, newValue, receiver) {
        if (updateExistingFactory(target, p, newValue)) {
            return true;
        }

        notifyFactoryListeners(newValue);
        defineModulesFactoryGetter(p, Settings.eagerPatches && shouldPatchFactories ? wrapAndPatchFactory(p, newValue) : newValue);

        return true;
    }
};

/**
 * Update a factory that exists in any Webpack instance with a new original factory.
 *
 * @target The module factories where this new original factory is being set
 * @param id The id of the module
 * @param newFactory The new original factory
 * @param ignoreExistingInTarget Whether to ignore checking if the factory already exists in the moduleFactoriesTarget
 * @returns Whether the original factory was updated, or false if it doesn't exist in any Webpack instance
 */
function updateExistingFactory(moduleFactoriesTarget: AnyWebpackRequire["m"], id: PropertyKey, newFactory: AnyModuleFactory, ignoreExistingInTarget: boolean = false) {
    let existingFactory: TypedPropertyDescriptor<AnyModuleFactory> | undefined;
    let moduleFactoriesWithFactory: AnyWebpackRequire["m"] | undefined;
    for (const wreq of allWebpackInstances) {
        if (ignoreExistingInTarget && wreq.m === moduleFactoriesTarget) continue;

        if (Object.hasOwn(wreq.m, id)) {
            existingFactory = Reflect.getOwnPropertyDescriptor(wreq.m, id);
            moduleFactoriesWithFactory = wreq.m;
            break;
        }
    }

    if (existingFactory != null) {
        // If existingFactory exists in any Webpack instance, it's either wrapped in defineModuleFactoryGetter, or it has already been required.
        // So define the descriptor of it on this current Webpack instance (if it doesn't exist already), call Reflect.set with the new original,
        // and let the correct logic apply (normal set, or defineModuleFactoryGetter setter)

        if (moduleFactoriesWithFactory !== moduleFactoriesTarget) {
            Reflect.defineProperty(moduleFactoriesTarget, id, existingFactory);
        }

        // Persist patched source and patched by in the new original factory, if the patched one has already been required
        if (IS_DEV && existingFactory.value != null) {
            newFactory[SYM_PATCHED_SOURCE] = existingFactory.value[SYM_PATCHED_SOURCE];
            newFactory[SYM_PATCHED_BY] = existingFactory.value[SYM_PATCHED_BY];
        }

        return Reflect.set(moduleFactoriesTarget, id, newFactory, moduleFactoriesTarget);
    }

    return false;
}

/**
 * Notify all factory listeners.
 *
 * @param factory The original factory to notify for
 */
function notifyFactoryListeners(factory: AnyModuleFactory) {
    for (const factoryListener of factoryListeners) {
        try {
            factoryListener(factory);
        } catch (err) {
            logger.error("Error in Webpack factory listener:\n", err, factoryListener);
        }
    }
}

/**
 * Define the getter for returning the patched version of the module factory.
 *
 * If eagerPatches is enabled, the factory argument should already be the patched version, else it will be the original
 * and only be patched when accessed for the first time.
 *
 * @param id The id of the module
 * @param factory The original or patched module factory
 */
function defineModulesFactoryGetter(id: PropertyKey, factory: MaybeWrappedModuleFactory) {
    const descriptor: PropertyDescriptor = {
        get() {
            // SYM_ORIGINAL_FACTORY means the factory is already patched
            if (!shouldPatchFactories || factory[SYM_ORIGINAL_FACTORY] != null) {
                return factory;
            }

            return (factory = wrapAndPatchFactory(id, factory));
        },
        set(newFactory: MaybeWrappedModuleFactory) {
            if (IS_DEV) {
                newFactory[SYM_PATCHED_SOURCE] = factory[SYM_PATCHED_SOURCE];
                newFactory[SYM_PATCHED_BY] = factory[SYM_PATCHED_BY];
            }

            if (factory[SYM_ORIGINAL_FACTORY] != null) {
                factory.toString = newFactory.toString.bind(newFactory);
                factory[SYM_ORIGINAL_FACTORY] = newFactory;
            } else {
                factory = newFactory;
            }
        }
    };

    // Define the getter in all the module factories objects. Patches are only executed once, so make sure all module factories object
    // have the patched version
    for (const wreq of allWebpackInstances) {
        define(wreq.m, id, descriptor);
    }
}

/**
 * Wraps and patches a module factory.
 *
 * @param id The id of the module
 * @param factory The original or patched module factory
 * @returns The wrapper for the patched module factory
 */
function wrapAndPatchFactory(id: PropertyKey, originalFactory: AnyModuleFactory) {
    const [patchedFactory, patchedSource, patchedBy] = patchFactory(id, originalFactory);

    const wrappedFactory: WrappedModuleFactory = function (...args) {
        // Restore the original factory in all the module factories objects. We want to make sure the original factory is restored properly, no matter what is the Webpack instance
        for (const wreq of allWebpackInstances) {
            define(wreq.m, id, { value: wrappedFactory[SYM_ORIGINAL_FACTORY] });
        }

        // eslint-disable-next-line prefer-const
        let [module, exports, require] = args;

        if (wreq == null) {
            if (!wreqFallbackApplied) {
                wreqFallbackApplied = true;

                // Make sure the require argument is actually the WebpackRequire function
                if (typeof require === "function" && require.m != null) {
                    const { stack } = new Error();
                    const webpackInstanceFileName = stack?.match(/\/assets\/(.+?\.js)/)?.[1];

                    logger.warn(
                        "WebpackRequire was not initialized, falling back to WebpackRequire passed to the first called patched module factory (" +
                        `id: ${String(id)}` + interpolateIfDefined`, WebpackInstance origin: ${webpackInstanceFileName}` +
                        ")"
                    );

                    _initWebpack(require as WebpackRequire);
                } else if (IS_DEV) {
                    logger.error("WebpackRequire was not initialized, running modules without patches instead.");
                    return wrappedFactory[SYM_ORIGINAL_FACTORY].apply(this, args);
                }
            } else if (IS_DEV) {
                return wrappedFactory[SYM_ORIGINAL_FACTORY].apply(this, args);
            }
        }

        let factoryReturn: unknown;
        try {
            // Call the patched factory
            factoryReturn = patchedFactory.apply(this, args);
        } catch (err) {
            // Just re-throw Discord errors
            if (patchedFactory === wrappedFactory[SYM_ORIGINAL_FACTORY]) {
                throw err;
            }

            logger.error("Error in patched module factory:\n", err);
            return wrappedFactory[SYM_ORIGINAL_FACTORY].apply(this, args);
        }

        exports = module.exports;
        if (exports == null) {
            return factoryReturn;
        }

        if (typeof require === "function") {
            const shouldIgnoreModule = _shouldIgnoreModule(exports);

            if (shouldIgnoreModule) {
                if (require.c != null) {
                    Object.defineProperty(require.c, id, {
                        value: require.c[id],
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
                callback(exports, id);
            } catch (err) {
                logger.error("Error in Webpack module listener:\n", err, callback);
            }
        }

        for (const [filter, callback] of waitForSubscriptions) {
            try {
                if (filter(exports)) {
                    waitForSubscriptions.delete(filter);
                    callback(exports, id);
                    continue;
                }

                if (typeof exports !== "object") {
                    continue;
                }

                for (const exportKey in exports) {
                    const exportValue = exports[exportKey];

                    if (exportValue != null && filter(exportValue)) {
                        waitForSubscriptions.delete(filter);
                        callback(exportValue, id);
                        break;
                    }
                }
            } catch (err) {
                logger.error("Error while firing callback for Webpack waitFor subscription:\n", err, filter, callback);
            }
        }

        return factoryReturn;
    };

    wrappedFactory.toString = originalFactory.toString.bind(originalFactory);
    wrappedFactory[SYM_ORIGINAL_FACTORY] = originalFactory;

    if (IS_DEV && patchedFactory !== originalFactory) {
        wrappedFactory[SYM_PATCHED_SOURCE] = patchedSource;
        wrappedFactory[SYM_PATCHED_BY] = patchedBy;
        originalFactory[SYM_PATCHED_SOURCE] = patchedSource;
        originalFactory[SYM_PATCHED_BY] = patchedBy;
    }

    // @ts-expect-error Allow GC to get into action, if possible
    originalFactory = undefined;
    return wrappedFactory;
}

/**
 * Patches a module factory.
 *
 * @param id The id of the module
 * @param factory The original module factory
 * @returns The patched module factory, the patched source of it, and the plugins that patched it
 */
function patchFactory(id: PropertyKey, factory: AnyModuleFactory): [patchedFactory: AnyModuleFactory, patchedSource: string, patchedBy: Set<string>] {
    // 0, prefix to turn it into an expression: 0,function(){} would be invalid syntax without the 0,
    let code: string = "0," + String(factory);
    let patchedSource = code;
    let patchedFactory = factory;

    const patchedBy = new Set<string>();

    for (let i = 0; i < patches.length; i++) {
        const patch = patches[i];

        const moduleMatches = typeof patch.find === "string"
            ? code.includes(patch.find)
            : (patch.find.global && (patch.find.lastIndex = 0), patch.find.test(code));

        if (!moduleMatches) {
            continue;
        }

        const buildNumber = getBuildNumber();
        const shouldCheckBuildId = !Settings.eagerPatches && buildNumber !== -1;

        if (
            shouldCheckBuildId &&
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
        const previousFactory = factory;
        let markedAsPatched = false;

        // We change all patch.replacement to array in plugins/index
        for (const replacement of patch.replacement as PatchReplacement[]) {
            if (
                shouldCheckBuildId &&
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
            const lastFactory = factory;

            try {
                const [newCode, totalTime] = executePatch(replacement.match, replacement.replace as string);

                if (IS_REPORTER) {
                    patchTimings.push([patch.plugin, id, replacement.match, totalTime]);
                }

                if (newCode === code) {
                    if (!patch.noWarn) {
                        logger.warn(`Patch by ${patch.plugin} had no effect (Module id is ${String(id)}): ${replacement.match}`);
                        if (IS_DEV) {
                            logger.debug("Function Source:\n", code);
                        }
                        if (IS_COMPANION_TEST)
                            reporterData.failedPatches.hadNoEffect.push({
                                ...patch,
                                id
                            });
                    }

                    if (patch.group) {
                        logger.warn(`Undoing patch group ${patch.find} by ${patch.plugin} because replacement ${replacement.match} had no effect`);
                        code = previousCode;
                        patchedFactory = previousFactory;

                        if (markedAsPatched) {
                            patchedBy.delete(patch.plugin);
                        }

                        if (IS_COMPANION_TEST)
                            reporterData.failedPatches.undoingPatchGroup.push({
                                ...patch,
                                id
                            });

                        break;
                    }

                    continue;
                }

                code = newCode;
                patchedSource = `// Webpack Module ${String(id)} - Patched by ${[...patchedBy, patch.plugin].join(", ")}\n${newCode}\n//# sourceURL=WebpackModule${String(id)}`;
                patchedFactory = (0, eval)(patchedSource);

                if (!patchedBy.has(patch.plugin)) {
                    patchedBy.add(patch.plugin);
                    markedAsPatched = true;
                }
            } catch (err) {
                logger.error(`Patch by ${patch.plugin} errored (Module id is ${String(id)}): ${replacement.match}\n`, err);

                if (IS_COMPANION_TEST)
                    reporterData.failedPatches.erroredPatch.push({
                        ...patch,
                        oldModule: lastCode,
                        newModule: code,
                        id
                    });

                if (IS_DEV) {
                    diffErroredPatch(code, lastCode, lastCode.match(replacement.match)!);
                }

                if (markedAsPatched) {
                    patchedBy.delete(patch.plugin);
                }

                if (patch.group) {
                    logger.warn(`Undoing patch group ${patch.find} by ${patch.plugin} because replacement ${replacement.match} errored`);
                    if (IS_COMPANION_TEST)
                        reporterData.failedPatches.undoingPatchGroup.push({
                            ...patch,
                            id
                        });
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

    return [patchedFactory, patchedSource, patchedBy];
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

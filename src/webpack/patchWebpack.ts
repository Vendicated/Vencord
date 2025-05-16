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
import { _blacklistBadModules, _initWebpack, factoryListeners, findModuleFactory, moduleListeners, waitForSubscriptions, wreq } from "./webpack";
import { AnyModuleFactory, AnyWebpackRequire, MaybePatchedModuleFactory, PatchedModuleFactory, WebpackRequire } from "./wreq.d";

export const patches = [] as Patch[];

export const SYM_IS_PROXIED_FACTORY = Symbol("WebpackPatcher.isProxiedFactory");
export const SYM_ORIGINAL_FACTORY = Symbol("WebpackPatcher.originalFactory");
export const SYM_PATCHED_SOURCE = Symbol("WebpackPatcher.patchedSource");
export const SYM_PATCHED_BY = Symbol("WebpackPatcher.patchedBy");
export const allWebpackInstances = new Set<AnyWebpackRequire>();

export const patchTimings = [] as Array<[plugin: string, moduleId: PropertyKey, match: PatchReplacement["match"], totalTime: number]>;

export const getBuildNumber = makeLazy(() => {
    try {
        function matchBuildNumber(factoryStr: string) {
            const buildNumberMatch = factoryStr.match(/.concat\("(\d+?)"\)/);
            if (buildNumberMatch == null) {
                return -1;
            }

            return Number(buildNumberMatch[1]);
        }

        const hardcodedFactoryStr = String(wreq.m[128014]);
        if (hardcodedFactoryStr.includes("Trying to open a changelog for an invalid build number")) {
            const hardcodedBuildNumber = matchBuildNumber(hardcodedFactoryStr);

            if (hardcodedBuildNumber !== -1) {
                return hardcodedBuildNumber;
            }
        }

        const moduleFactory = findModuleFactory("Trying to open a changelog for an invalid build number");
        return matchBuildNumber(String(moduleFactory));
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

const logger = new Logger("WebpackPatcher", "#8caaee");

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
// We use this setter to intercept when wreq.m is defined and setup our setters which decide whether we should patch these module factories
// and the Webpack instance where they are being defined.

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

        // Ensure this is likely one of Discord main Webpack instances.
        // We may catch Discord bundled libs, React Devtools or other extensions Webpack instances here.
        const { stack } = new Error();
        if (!stack?.includes("http") || stack.match(/at \d+? \(/) || !String(this).includes("exports:{}")) {
            return;
        }

        const fileName = stack.match(/\/assets\/(.+?\.js)/)?.[1];
        if (fileName?.includes("libdiscore")) {
            return;
        }

        // Define a setter for the bundlePath property of WebpackRequire. Only Webpack instances which include chunk loading functionality,
        // like the main Discord Webpack, have this property.
        // So if the setter is called with the Discord bundlePath, this means we should patch this instance and initialize the internal references to WebpackRequire.
        define(this, "p", {
            enumerable: false,

            set(this: AnyWebpackRequire, bundlePath: NonNullable<AnyWebpackRequire["p"]>) {
                define(this, "p", { value: bundlePath });
                clearTimeout(bundlePathTimeout);

                if (bundlePath !== "/assets/") {
                    return;
                }

                if (wreq == null && this.c != null) {
                    logger.info("Main WebpackInstance found" + interpolateIfDefined` in ${fileName}` + ", initializing internal references to WebpackRequire");
                    _initWebpack(this as WebpackRequire);
                }

                patchThisInstance();
            }
        });

        // In the past, the sentry Webpack instance which we also wanted to patch used to rely on chunks being loaded before initting sentry.
        // This Webpack instance did not include actual chunk loading, and only awaited for them to be loaded, which means it did not include the bundlePath property.
        // To keep backwards compability, in case this is ever the case again, and keep patching this type of instance, we explicity patch instances which include wreq.O and not wreq.p.
        // Since we cannot check what is the bundlePath of the instance to filter for the Discord bundlePath, we only patch it if wreq.p is not included,
        // which means the instance relies on another instance which does chunk loading, and that makes it very likely to only target Discord Webpack instances like the old sentry.

        // Instead of patching when wreq.O is defined, wait for when wreq.O.j is defined, since that will be one of the last things to happen,
        // which can assure wreq.p could have already been defined before.
        define(this, "O", {
            enumerable: false,

            set(this: AnyWebpackRequire, onChunksLoaded: NonNullable<AnyWebpackRequire["O"]>) {
                define(this, "O", { value: onChunksLoaded });
                clearTimeout(onChunksLoadedTimeout);

                const wreq = this;
                define(onChunksLoaded, "j", {
                    enumerable: false,

                    set(this: NonNullable<AnyWebpackRequire["O"]>, j: NonNullable<AnyWebpackRequire["O"]>["j"]) {
                        define(this, "j", { value: j });

                        if (wreq.p == null) {
                            patchThisInstance();
                        }
                    }
                });
            }
        });

        // If neither of these properties setters were triggered, delete them as they are not needed anymore.
        const bundlePathTimeout = setTimeout(() => Reflect.deleteProperty(this, "p"), 0);
        const onChunksLoadedTimeout = setTimeout(() => Reflect.deleteProperty(this, "O"), 0);

        /**
         * Patch the current Webpack instance assigned to `this` context.
         * This should only be called if this instance was later found to be one we need to patch.
         */
        const patchThisInstance = () => {
            logger.info("Found Webpack module factories" + interpolateIfDefined` in ${fileName}`);
            allWebpackInstances.add(this);

            // Proxy (and maybe patch) pre-populated factories
            for (const moduleId in originalModules) {
                updateExistingOrProxyFactory(originalModules, moduleId, originalModules[moduleId], originalModules, true);
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

            // Overwrite Webpack's defineExports function to define the export descriptors configurable.
            // This is needed so we can later blacklist specific exports from Webpack search by making them non-enumerable
            this.d = function (exports, definition) {
                for (const key in definition) {
                    if (Object.hasOwn(definition, key) && !Object.hasOwn(exports, key)) {
                        Object.defineProperty(exports, key, {
                            enumerable: true,
                            configurable: true,
                            get: definition[key],
                        });
                    }
                }
            };
        };
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

    set: updateExistingOrProxyFactory
};

// The proxy for patching lazily and/or running factories with our wrapper.
const moduleFactoryHandler: ProxyHandler<MaybePatchedModuleFactory> = {
    apply(target, thisArg: unknown, argArray: Parameters<AnyModuleFactory>) {
        // SYM_ORIGINAL_FACTORY means the factory has already been patched
        if (target[SYM_ORIGINAL_FACTORY] != null) {
            return runFactoryWithWrap(target as PatchedModuleFactory, thisArg, argArray);
        }

        // SAFETY: Factories have `name` as their key in the module factories object, and that is always their module id
        const moduleId: string = target.name;

        const patchedFactory = patchFactory(moduleId, target);
        return runFactoryWithWrap(patchedFactory, thisArg, argArray);
    },

    get(target, p, receiver) {
        if (p === SYM_IS_PROXIED_FACTORY) {
            return true;
        }

        const originalFactory: AnyModuleFactory = target[SYM_ORIGINAL_FACTORY] ?? target;

        // Redirect these properties to the original factory, including making `toString` return the original factory `toString`
        if (p === "toString" || p === SYM_PATCHED_SOURCE || p === SYM_PATCHED_BY) {
            const v = Reflect.get(originalFactory, p, originalFactory);
            return p === "toString" ? v.bind(originalFactory) : v;
        }

        return Reflect.get(target, p, receiver);
    }
};

function updateExistingOrProxyFactory(moduleFactories: AnyWebpackRequire["m"], moduleId: PropertyKey, newFactory: AnyModuleFactory, receiver: any, ignoreExistingInTarget = false) {
    if (updateExistingFactory(moduleFactories, moduleId, newFactory, receiver, ignoreExistingInTarget)) {
        return true;
    }

    notifyFactoryListeners(moduleId, newFactory);

    const proxiedFactory = new Proxy(Settings.eagerPatches ? patchFactory(moduleId, newFactory) : newFactory, moduleFactoryHandler);
    return Reflect.set(moduleFactories, moduleId, proxiedFactory, receiver);
}

/**
 * Update a duplicated factory that exists in any of the Webpack instances we track with a new original factory.
 *
 * @param moduleFactories The module factories where this new original factory is being set
 * @param moduleId The id of the module
 * @param newFactory The new original factory
 * @param receiver The receiver of the factory
 * @param ignoreExistingInTarget Whether to ignore checking if the factory already exists in the moduleFactories where it is being set
 * @returns Whether the original factory was updated, or false if it doesn't exist in any of the tracked Webpack instances
 */
function updateExistingFactory(moduleFactories: AnyWebpackRequire["m"], moduleId: PropertyKey, newFactory: AnyModuleFactory, receiver: any, ignoreExistingInTarget) {
    let existingFactory: AnyModuleFactory | undefined;
    let moduleFactoriesWithFactory: AnyWebpackRequire["m"] | undefined;
    for (const wreq of allWebpackInstances) {
        if (ignoreExistingInTarget && wreq.m === moduleFactories) {
            continue;
        }

        if (Object.hasOwn(wreq.m, moduleId)) {
            existingFactory = wreq.m[moduleId];
            moduleFactoriesWithFactory = wreq.m;
            break;
        }
    }

    if (existingFactory != null) {
        // If existingFactory exists in any of the Webpack instances we track, it's either wrapped in our proxy, or it has already been required.
        // In the case it is wrapped in our proxy, and the instance we are setting does not already have it, we need to make sure the instance contains our proxy too.
        if (moduleFactoriesWithFactory !== moduleFactories && existingFactory[SYM_IS_PROXIED_FACTORY]) {
            Reflect.set(moduleFactories, moduleId, existingFactory, receiver);
        }
        // Else, if it is not wrapped in our proxy, set this new original factory in all the instances
        else {
            defineInWebpackInstances(moduleId, newFactory);
        }

        // Update existingFactory with the new original, if it does have a current original factory
        if (existingFactory[SYM_ORIGINAL_FACTORY] != null) {
            existingFactory[SYM_ORIGINAL_FACTORY] = newFactory;
        }

        // Persist patched source and patched by in the new original factory
        if (IS_DEV) {
            newFactory[SYM_PATCHED_SOURCE] = existingFactory[SYM_PATCHED_SOURCE];
            newFactory[SYM_PATCHED_BY] = existingFactory[SYM_PATCHED_BY];
        }

        return true;
    }

    return false;
}

/**
 * Define a module factory in all the Webpack instances we track.
 *
 * @param moduleId The id of the module
 * @param factory The factory
 */
function defineInWebpackInstances(moduleId: PropertyKey, factory: AnyModuleFactory) {
    for (const wreq of allWebpackInstances) {
        define(wreq.m, moduleId, { value: factory });
    }
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
 * @param patchedFactory The (possibly) patched module factory
 * @param thisArg The `value` of the call to the factory
 * @param argArray The arguments of the call to the factory
 */
function runFactoryWithWrap(patchedFactory: PatchedModuleFactory, thisArg: unknown, argArray: Parameters<MaybePatchedModuleFactory>) {
    const originalFactory = patchedFactory[SYM_ORIGINAL_FACTORY];

    if (patchedFactory === originalFactory) {
        // @ts-expect-error Clear up ORIGINAL_FACTORY if the factory did not have any patch applied
        delete patchedFactory[SYM_ORIGINAL_FACTORY];
    }

    let [module, exports, require] = argArray;

    // Restore the original factory in all the module factories objects, discarding our proxy and allowing it to be garbage collected
    defineInWebpackInstances(module.id, originalFactory);

    if (wreq == null) {
        if (!wreqFallbackApplied) {
            wreqFallbackApplied = true;

            // Make sure the require argument is actually the WebpackRequire function
            if (typeof require === "function" && require.m != null && require.c != null) {
                const { stack } = new Error();
                const webpackInstanceFileName = stack?.match(/\/assets\/(.+?\.js)/)?.[1];

                logger.warn(
                    "WebpackRequire was not initialized, falling back to WebpackRequire passed to the first called wrapped module factory (" +
                    `id: ${String(module.id)}` + interpolateIfDefined`, WebpackInstance origin: ${webpackInstanceFileName}` +
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

    if (typeof require === "function" && require.c) {
        if (_blacklistBadModules(require.c, exports, module.id)) {
            return factoryReturn;
        }
    }

    if (exports == null) {
        return factoryReturn;
    }

    for (const callback of moduleListeners) {
        try {
            callback(exports, module.id);
        } catch (err) {
            logger.error("Error in Webpack module listener:\n", err, callback);
        }
    }

    for (const [filter, callback] of waitForSubscriptions) {
        try {
            if (filter(exports)) {
                waitForSubscriptions.delete(filter);
                callback(exports, module.id);
                continue;
            }
        } catch (err) {
            logger.error(
                "Error while filtering or firing callback for Webpack waitFor subscription:\n", err,
                "\n\nModule exports:", exports,
                "\n\nFilter:", filter,
                "\n\nCallback:", callback
            );
        }

        if (typeof exports !== "object") {
            continue;
        }

        for (const exportKey in exports) {
            try {
                // Some exports might have not been initialized yet due to circular imports, so try catch it.
                try {
                    var exportValue = exports[exportKey];
                } catch {
                    continue;
                }

                if (exportValue != null && filter(exportValue)) {
                    waitForSubscriptions.delete(filter);
                    callback(exportValue, module.id);
                    break;
                }
            } catch (err) {
                logger.error(
                    "Error while filtering or firing callback for Webpack waitFor subscription:\n", err,
                    "\n\nExport value:", exports,
                    "\n\nFilter:", filter,
                    "\n\nCallback:", callback
                );
            }
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

        const buildNumber = getBuildNumber();
        const shouldCheckBuildNumber = buildNumber !== -1;

        if (
            shouldCheckBuildNumber &&
            (patch.fromBuild != null && buildNumber < patch.fromBuild) ||
            (patch.toBuild != null && buildNumber > patch.toBuild)
        ) {
            patches.splice(i--, 1);
            continue;
        }

        const moduleMatches = typeof patch.find === "string"
            ? code.includes(patch.find)
            : (patch.find.global && (patch.find.lastIndex = 0), patch.find.test(code));

        if (!moduleMatches) {
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
                    if (!(patch.noWarn || replacement.noWarn)) {
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

                const pluginsList = [...patchedBy];
                if (!patchedBy.has(patch.plugin)) {
                    pluginsList.push(patch.plugin);
                }

                code = newCode;
                patchedSource = `// Webpack Module ${String(moduleId)} - Patched by ${pluginsList.join(", ")}\n${newCode}\n//# sourceURL=file:///WebpackModule${String(moduleId)}`;
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

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated, Nuckyz, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { interpolateIfDefined } from "@utils/misc";
import { canonicalizeReplacement } from "@utils/patches";
import { PatchReplacement } from "@utils/types";

import { traceFunction } from "../debug/Tracer";
import { patches } from "../plugins";
import { _initWebpack, AnyModuleFactory, AnyWebpackRequire, factoryListeners, moduleListeners, PatchedModuleFactories, PatchedModuleFactory, waitForSubscriptions, WebpackRequire, wreq } from ".";

const logger = new Logger("WebpackInterceptor", "#8caaee");

/** A set with all the Webpack instances */
export const allWebpackInstances = new Set<AnyWebpackRequire>();
/** Whether we tried to fallback to factory WebpackRequire, or disabled patches */
let wreqFallbackApplied = false;

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

// wreq.O is the Webpack onChunksLoaded function.
// It is pretty likely that all important Discord Webpack instances will have this property set,
// because Discord bundled code is chunked.
// As of the time of writing, only the main and sentry Webpack instances have this property, and they are the only ones we care about.

// We use this setter to intercept when wreq.O is defined, so we can patch the modules factories (wreq.m).
// wreq.m is pre-populated with module factories, and is also populated via webpackGlobal.push
// The sentry module also has their own Webpack with a pre-populated wreq.m, so this also patches those.
// We wrap wreq.m with our proxy, which is responsible for patching the module factories when they are set, or definining getters for the patched versions.

// If this is the main Webpack, we also set up the internal references to WebpackRequire.
define(Function.prototype, "O", {
    enumerable: false,

    set(this: AnyWebpackRequire, onChunksLoaded: AnyWebpackRequire["O"]) {
        define(this, "O", { value: onChunksLoaded });

        const { stack } = new Error();
        if (this.m == null || !(stack?.includes("discord.com") || stack?.includes("discordapp.com"))) {
            return;
        }

        const fileName = stack?.match(/\/assets\/(.+?\.js)/)?.[1];
        logger.info("Found Webpack module factories" + interpolateIfDefined` in ${fileName}`);

        allWebpackInstances.add(this);

        // Define a setter for the bundlePath property of WebpackRequire. Only the main Webpack has this property.
        // So if the setter is called, this means we can initialize the internal references to WebpackRequire.
        define(this, "p", {
            enumerable: false,

            set(this: WebpackRequire, bundlePath: WebpackRequire["p"]) {
                define(this, "p", { value: bundlePath });
                clearTimeout(setterTimeout);

                logger.info("Main Webpack found" + interpolateIfDefined` in ${fileName}` + ", initializing internal references to WebpackRequire");
                _initWebpack(this);
            }
        });
        // setImmediate to clear this property setter if this is not the main Webpack.
        // If this is the main Webpack, wreq.p will always be set before the timeout runs.
        const setterTimeout = setTimeout(() => Reflect.deleteProperty(this, "p"), 0);

        // Patch the pre-populated factories
        for (const id in this.m) {
            if (updateExistingFactory(this.m, id, this.m[id], true)) {
                continue;
            }

            defineModulesFactoryGetter(id, Settings.eagerPatches ? patchFactory(id, this.m[id]) : this.m[id]);
        }

        define(this.m, Symbol.toStringTag, {
            value: "ModuleFactories",
            enumerable: false
        });

        // The proxy responsible for patching the module factories when they are set, or definining getters for the patched versions
        const proxiedModuleFactories = new Proxy(this.m, moduleFactoriesHandler);
        /*
        If Discord ever decides to set module factories using the variable of the modules object directly, instead of wreq.m, switch the proxy to the prototype
        define(this, "m", { value: Reflect.setPrototypeOf(this.m, new Proxy(this.m, moduleFactoriesHandler)) });
        */

        define(this, "m", { value: proxiedModuleFactories });
    }
});

/**
 * Define the getter for returning the patched version of the module factory.
 *
 * If eagerPatches is enabled, the factory argument should already be the patched version, else it will be the original
 * and only be patched when accessed for the first time.
 *
 * @param id The id of the module
 * @param factory The original or patched module factory
 */
function defineModulesFactoryGetter(id: PropertyKey, factory: PatchedModuleFactory) {
    // Define the getter in all the module factories objects. Patches are only executed once, so make sure all module factories object
    // have the patched version
    for (const wreq of allWebpackInstances) {
        define(wreq.m, id, {
            get() {
                // $$vencordOriginal means the factory is already patched
                if (factory.$$vencordOriginal != null) {
                    return factory;
                }

                return (factory = patchFactory(id, factory));
            },
            set(v: AnyModuleFactory) {
                if (factory.$$vencordOriginal != null) {
                    factory.$$vencordOriginal = v;
                } else {
                    factory = v;
                }
            }
        });
    }
}

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
    let existingFactory: TypedPropertyDescriptor<PatchedModuleFactory> | undefined;
    for (const wreq of allWebpackInstances) {
        if (ignoreExistingInTarget && wreq.m === moduleFactoriesTarget) continue;

        if (Reflect.getOwnPropertyDescriptor(wreq.m, id) != null) {
            existingFactory = Reflect.getOwnPropertyDescriptor(wreq.m, id);
            break;
        }
    }

    if (existingFactory != null) {
        // If existingFactory exists in any Webpack instance, its either wrapped in defineModuleFactoryGetter, or it has already been required.
        // So define the descriptor of it on this current Webpack instance, call Reflect.set with the new original,
        // and let the correct logic apply (normal set, or defineModuleFactoryGetter setter)

        Reflect.defineProperty(moduleFactoriesTarget, id, existingFactory);
        return Reflect.set(moduleFactoriesTarget, id, newFactory, moduleFactoriesTarget);
    }

    return false;
}

const moduleFactoriesHandler: ProxyHandler<PatchedModuleFactories> = {
    /*
    If Discord ever decides to set module factories using the variable of the modules object directly instead of wreq.m, we need to switch the proxy to the prototype
    and that requires defining additional traps for keeping the object working

    // Proxies on the prototype dont intercept "get" when the property is in the object itself. But in case it isn't we need to return undefined,
    // to avoid Reflect.get having no effect and causing a stack overflow
    get: (target, p, receiver) => {
        return undefined;
    },
    // Same thing as get
    has: (target, p) => {
        return false;
    }
    */

    // The set trap for patching or defining getters for the module factories when new module factories are loaded
    set: (target, p, newValue, receiver) => {
        // If the property is not a number, we are not dealing with a module factory
        if (Number.isNaN(Number(p))) {
            return define(target, p, { value: newValue });
        }

        if (updateExistingFactory(target, p, newValue)) {
            return true;
        }

        if (!Settings.eagerPatches) {
            // eagerPatches are disabled, so the factory argument should be the original
            defineModulesFactoryGetter(p, newValue);
            return true;
        }

        const patchedFactory = patchFactory(p, newValue);

        // If multiple Webpack instances exist, when new a new module is loaded, it will be set in all the module factories objects.
        // Because patches are only executed once, we need to set the patched version in all of them, to avoid the Webpack instance
        // that uses the factory to contain the original factory instead of the patched, in case it was set first in another instance
        defineModulesFactoryGetter(p, patchedFactory);

        return true;
    }
};

/**
 * Patches a module factory.
 *
 * The factory argument will become the patched version of the factory.
 * @param id The id of the module
 * @param factory The original or patched module factory
 * @returns The wrapper for the patched module factory
 */
function patchFactory(id: PropertyKey, factory: AnyModuleFactory) {
    const originalFactory = factory;

    for (const factoryListener of factoryListeners) {
        try {
            factoryListener(originalFactory);
        } catch (err) {
            logger.error("Error in Webpack factory listener:\n", err, factoryListener);
        }
    }

    const patchedBy = new Set<string>();

    // 0, prefix to turn it into an expression: 0,function(){} would be invalid syntax without the 0,
    let code: string = "0," + String(factory);

    for (let i = 0; i < patches.length; i++) {
        const patch = patches[i];
        if (patch.predicate && !patch.predicate()) continue;

        const moduleMatches = typeof patch.find === "string"
            ? code.includes(patch.find)
            : (patch.find.global && (patch.find.lastIndex = 0), patch.find.test(code));

        if (!moduleMatches) continue;

        patchedBy.add(patch.plugin);

        const executePatch = traceFunction(`patch by ${patch.plugin}`, (match: string | RegExp, replace: string) => code.replace(match, replace));
        const previousCode = code;
        const previousFactory = factory;

        // We change all patch.replacement to array in plugins/index
        for (const replacement of patch.replacement as PatchReplacement[]) {
            if (replacement.predicate && !replacement.predicate()) continue;

            const lastCode = code;
            const lastFactory = factory;

            canonicalizeReplacement(replacement, patch.plugin);

            try {
                const newCode = executePatch(replacement.match, replacement.replace as string);
                if (newCode === code) {
                    if (!patch.noWarn) {
                        logger.warn(`Patch by ${patch.plugin} had no effect (Module id is ${String(id)}): ${replacement.match}`);
                        if (IS_DEV) {
                            logger.debug("Function Source:\n", code);
                        }
                    }

                    if (patch.group) {
                        logger.warn(`Undoing patch group ${patch.find} by ${patch.plugin} because replacement ${replacement.match} had no effect`);
                        code = previousCode;
                        factory = previousFactory;
                        patchedBy.delete(patch.plugin);
                        break;
                    }

                    continue;
                }

                code = newCode;
                factory = (0, eval)(`// Webpack Module ${String(id)} - Patched by ${[...patchedBy].join(", ")}\n${newCode}\n//# sourceURL=WebpackModule${String(id)}`);
            } catch (err) {
                logger.error(`Patch by ${patch.plugin} errored (Module id is ${String(id)}): ${replacement.match}\n`, err);

                if (IS_DEV) {
                    const changeSize = code.length - lastCode.length;
                    const match = lastCode.match(replacement.match)!;

                    // Use 200 surrounding characters of context
                    const start = Math.max(0, match.index! - 200);
                    const end = Math.min(lastCode.length, match.index! + match[0].length + 200);
                    // (changeSize may be negative)
                    const endPatched = end + changeSize;

                    const context = lastCode.slice(start, end);
                    const patchedContext = code.slice(start, endPatched);

                    // inline require to avoid including it in !IS_DEV builds
                    const diff = (require("diff") as typeof import("diff")).diffWordsWithSpace(context, patchedContext);
                    let fmt = "%c %s ";
                    const elements = [] as string[];
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

                patchedBy.delete(patch.plugin);

                if (patch.group) {
                    logger.warn(`Undoing patch group ${patch.find} by ${patch.plugin} because replacement ${replacement.match} errored`);
                    code = previousCode;
                    factory = previousFactory;
                    break;
                }

                code = lastCode;
                factory = lastFactory;
            }
        }

        if (!patch.all) patches.splice(i--, 1);
    }

    // The patched factory wrapper, define it in an object to preserve the name after minification
    const patchedFactory: PatchedModuleFactory = {
        PatchedFactory(...args: Parameters<AnyModuleFactory>) {
            // Restore the original factory in all the module factories objects,
            // because we want to make sure the original factory is restored properly, no matter what is the Webpack instance
            for (const wreq of allWebpackInstances) {
                define(wreq.m, id, { value: patchedFactory.$$vencordOriginal });
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
                    }
                }

                if (IS_DEV) {
                    return originalFactory.apply(this, args);
                }
            }

            let factoryReturn: unknown;
            try {
                // Call the patched factory
                factoryReturn = factory.apply(this, args);
            } catch (err) {
                // Just re-throw Discord errors
                if (factory === originalFactory) throw err;

                logger.error("Error in patched module factory", err);
                return originalFactory.apply(this, args);
            }

            // Webpack sometimes sets the value of module.exports directly, so assign exports to it to make sure we properly handle it
            exports = module?.exports;
            if (exports == null) return factoryReturn;

            // There are (at the time of writing) 11 modules exporting the window
            // Make these non enumerable to improve webpack search performance
            if ((exports === window || exports?.default === window) && typeof require === "function" && require.c != null) {
                define(require.c, id, {
                    value: require.c[id],
                    enumerable: false
                });
                return factoryReturn;
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
                        callback(exports);
                    } else if (exports.default && filter(exports.default)) {
                        waitForSubscriptions.delete(filter);
                        callback(exports.default);
                    }
                } catch (err) {
                    logger.error("Error while firing callback for Webpack waitFor subscription:\n", err, filter, callback);
                }
            }

            return factoryReturn;
        }
    }.PatchedFactory;

    patchedFactory.toString = originalFactory.toString.bind(originalFactory);
    patchedFactory.$$vencordOriginal = originalFactory;

    return patchedFactory;
}

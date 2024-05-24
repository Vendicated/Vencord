/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { canonicalizeReplacement } from "@utils/patches";
import { PatchReplacement } from "@utils/types";

import { traceFunction } from "../debug/Tracer";
import { patches } from "../plugins";
import { _initWebpack, factoryListeners, ModuleFactory, moduleListeners, waitForSubscriptions, WebpackRequire, wreq } from ".";

type PatchedModuleFactory = ModuleFactory & {
    $$vencordOriginal?: ModuleFactory;
};

type PatchedModuleFactories = Record<PropertyKey, PatchedModuleFactory>;

const logger = new Logger("WebpackInterceptor", "#8caaee");

/** A set with all the module factories objects */
const allModuleFactories = new Set<PatchedModuleFactories>();

function defineModuleFactoryGetter(modulesFactories: PatchedModuleFactories, id: PropertyKey, factory: PatchedModuleFactory) {
    Object.defineProperty(modulesFactories, id, {
        configurable: true,
        enumerable: true,

        get() {
            // $$vencordOriginal means the factory is already patched
            if (factory.$$vencordOriginal != null) {
                return factory;
            }

            // This patches factories if eagerPatches are disabled
            return (factory = patchFactory(id, factory));
        },
        set(v: ModuleFactory) {
            if (factory.$$vencordOriginal != null) {
                factory.$$vencordOriginal = v;
            } else {
                factory = v;
            }
        }
    });
}

const moduleFactoriesHandler: ProxyHandler<PatchedModuleFactories> = {
    set: (target, p, newValue, receiver) => {
        // If the property is not a number, we are not dealing with a module factory
        if (Number.isNaN(Number(p))) {
            return Reflect.set(target, p, newValue, receiver);
        }

        const existingFactory = Reflect.get(target, p, target);

        if (!Settings.eagerPatches) {
            // If existingFactory exists, its either wrapped in defineModuleFactoryGetter, or it has already been required
            // so call Reflect.set with the new original and let the correct logic apply (normal set, or defineModuleFactoryGetter setter)
            if (existingFactory != null) {
                return Reflect.set(target, p, newValue, receiver);
            }

            defineModuleFactoryGetter(target, p, newValue);
            return true;
        }

        // Check if this factory is already patched
        if (existingFactory?.$$vencordOriginal != null) {
            existingFactory.$$vencordOriginal = newValue;
            return true;
        }

        const patchedFactory = patchFactory(p, newValue);

        // Modules are only patched once, so we need to set the patched factory on all the modules
        for (const moduleFactories of allModuleFactories) {
            Object.defineProperty(moduleFactories, p, {
                value: patchedFactory,
                configurable: true,
                enumerable: true,
                writable: true
            });
        }

        return true;
    }
};

// wreq.m is the Webpack object containing module factories.
// This is pre-populated with module factories, and is also populated via webpackGlobal.push
// The sentry module also has their own Webpack with a pre-populated module factories object, so this also targets that
// We wrap it with our proxy, which is responsible for patching the module factories, or setting up getters for them
// If this is the main Webpack, we also set up the internal references to WebpackRequire
Object.defineProperty(Function.prototype, "m", {
    configurable: true,

    set(this: WebpackRequire, moduleFactories: PatchedModuleFactories) {
        // When using React DevTools or other extensions, we may also catch their Webpack here.
        // This ensures we actually got the right ones
        const { stack } = new Error();
        if ((stack?.includes("discord.com") || stack?.includes("discordapp.com")) && !Array.isArray(moduleFactories)) {
            logger.info("Found Webpack module factories", stack.match(/\/assets\/(.+?\.js)/)?.[1] ?? "");

            // setImmediate to clear this property setter if this is not the main Webpack
            // If this is the main Webpack, wreq.m will always be set before the timeout runs
            const setterTimeout = setTimeout(() => delete (this as Partial<WebpackRequire>).p, 0);
            Object.defineProperty(this, "p", {
                configurable: true,

                set(this: WebpackRequire, v: WebpackRequire["p"]) {
                    if (v !== "/assets/") return;

                    logger.info("Main Webpack found, initializing internal references to WebpackRequire");
                    _initWebpack(this);
                    clearTimeout(setterTimeout);

                    Object.defineProperty(this, "p", {
                        value: v,
                        configurable: true,
                        enumerable: true,
                        writable: true
                    });
                }
            });

            for (const id in moduleFactories) {
                // If we have eagerPatches enabled we have to patch the pre-populated factories
                if (Settings.eagerPatches) {
                    moduleFactories[id] = patchFactory(id, moduleFactories[id]);
                } else {
                    defineModuleFactoryGetter(moduleFactories, id, moduleFactories[id]);
                }
            }

            allModuleFactories.add(moduleFactories);

            Object.defineProperty(moduleFactories, Symbol.toStringTag, {
                value: "ModuleFactories",
                configurable: true,
                writable: true
            });
            moduleFactories = new Proxy(moduleFactories, moduleFactoriesHandler);
        }

        Object.defineProperty(this, "m", {
            value: moduleFactories,
            configurable: true,
            enumerable: true,
            writable: true
        });
    }
});

let webpackNotInitializedLogged = false;

function patchFactory(id: PropertyKey, factory: ModuleFactory) {
    for (const factoryListener of factoryListeners) {
        try {
            factoryListener(factory);
        } catch (err) {
            logger.error("Error in Webpack factory listener:\n", err, factoryListener);
        }
    }

    const originalFactory = factory;
    const patchedBy = new Set<string>();

    // Discords Webpack chunks for some ungodly reason contain random
    // newlines. Cyn recommended this workaround and it seems to work fine,
    // however this could potentially break code, so if anything goes weird,
    // this is probably why.
    // Additionally, `[actual newline]` is one less char than "\n", so if Discord
    // ever targets newer browsers, the minifier could potentially use this trick and
    // cause issues.
    //
    // 0, prefix is to turn it into an expression: 0,function(){} would be invalid syntax without the 0,
    let code: string = "0," + String(factory).replaceAll("\n", "");

    for (let i = 0; i < patches.length; i++) {
        const patch = patches[i];
        if (patch.predicate && !patch.predicate()) continue;

        const moduleMatches = typeof patch.find === "string"
            ? code.includes(patch.find)
            : patch.find.test(code);

        if (!moduleMatches) continue;

        patchedBy.add(patch.plugin);

        const executePatch = traceFunction(`patch by ${patch.plugin}`, (match: string | RegExp, replace: string) => code.replace(match, replace));
        const previousFactory = factory;
        const previousCode = code;

        // We change all patch.replacement to array in plugins/index
        for (const replacement of patch.replacement as PatchReplacement[]) {
            if (replacement.predicate && !replacement.predicate()) continue;

            const lastFactory = factory;
            const lastCode = code;

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
                        factory = previousFactory;
                        code = previousCode;
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
                    factory = previousFactory;
                    code = previousCode;
                    break;
                }

                factory = lastFactory;
                code = lastCode;
            }
        }

        if (!patch.all) patches.splice(i--, 1);
    }

    const patchedFactory: PatchedModuleFactory = (module, exports, require) => {
        for (const moduleFactories of allModuleFactories) {
            Object.defineProperty(moduleFactories, id, {
                value: patchedFactory.$$vencordOriginal,
                configurable: true,
                enumerable: true,
                writable: true
            });
        }

        if (wreq == null && IS_DEV) {
            if (!webpackNotInitializedLogged) {
                webpackNotInitializedLogged = true;
                logger.error("WebpackRequire was not initialized, running modules without patches instead.");
            }

            return void originalFactory(module, exports, require);
        }

        try {
            factory(module, exports, require);
        } catch (err) {
            // Just rethrow Discord errors
            if (factory === originalFactory) throw err;

            logger.error("Error in patched module", err);
            return void originalFactory(module, exports, require);
        }

        // Webpack sometimes sets the value of module.exports directly, so assign exports to it to make sure we properly handle it
        exports = module.exports;
        if (exports == null) return;

        // There are (at the time of writing) 11 modules exporting the window
        // Make these non enumerable to improve webpack search performance
        if (exports === window && require.c) {
            Object.defineProperty(require.c, id, {
                value: require.c[id],
                configurable: true,
                enumerable: false,
                writable: true
            });
            return;
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
    };

    patchedFactory.toString = originalFactory.toString.bind(originalFactory);
    patchedFactory.$$vencordOriginal = originalFactory;

    return patchedFactory;
}

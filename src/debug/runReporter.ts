/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import * as Webpack from "@webpack";
import { getBuildNumber, patches } from "@webpack/patcher";

import { loadLazyChunks } from "./loadLazyChunks";

async function runReporter() {
    const ReporterLogger = new Logger("Reporter");

    try {
        ReporterLogger.log("Starting test...");

        const { promise: loadLazyChunksDone, resolve: loadLazyChunksDoneResolve } = Promise.withResolvers<void>();

        function startLoadingChunks() {
            Webpack.factoryListeners.delete(startLoadingChunks);

            // Factory listeners are first called as soon as WebpackRequire is initialized, while the Webpack runtime is still being set up.
            // Things like wreq.u, wreq.e and wreq.f are only defined later in the same task, so wait for it to finish
            setTimeout(() => {
                // Stylesheets are not needed for testing, so skip loading them for every chunk
                Webpack.wreq.f.css = () => { };

                loadLazyChunks().then(loadLazyChunksDoneResolve);
            }, 0);
        }

        Webpack.factoryListeners.add(startLoadingChunks);
        await loadLazyChunksDone;

        // Manually require all modules to make sure all lazily required modules are patched
        for (const moduleId of Object.keys(Webpack.wreq.m)) {
            try {
                Webpack.wreq(moduleId);
            } catch { }
        }

        if (IS_REPORTER && IS_WEB && !IS_VESKTOP) {
            console.log("[REPORTER_META]", {
                buildNumber: getBuildNumber(),
                buildHash: window.GLOBAL_ENV.SENTRY_TAGS.buildId
            });
        }

        for (const patch of patches) {
            if (!patch.all) {
                new Logger("WebpackPatcher").warn(`Patch by ${patch.plugin} found no module (Module id is -): ${patch.find}`);
            }
        }

        // Slow patches reporting is disabled for now since it is too noisy
        // for (const [plugin, moduleId, match, totalTime] of patchTimings) {
        //     if (totalTime > 10) {
        //         new Logger("WebpackPatcher").warn(`Patch by ${plugin} took ${Math.round(totalTime * 100) / 100}ms (Module id is ${String(moduleId)}): ${match}`);
        //     }
        // }

        for (const [searchType, args] of Webpack.lazyWebpackSearchHistory) {
            let method = searchType;

            if (searchType === "findComponent") method = "find";
            if (searchType === "findExportedComponent") method = "findByProps";
            if (searchType === "waitFor" || searchType === "waitForComponent") {
                if (typeof args[0] === "string") method = "findByProps";
                else method = "find";
            }
            if (searchType === "waitForStore") method = "findStore";

            let result: any;
            try {
                if (method === "proxyLazyWebpack" || method === "LazyComponentWebpack") {
                    const [factory] = args;
                    result = factory();
                } else if (method === "extractAndLoadChunks") {
                    const [code, matcher] = args;

                    result = await Webpack.extractAndLoadChunks(code, matcher);
                    if (result === false) result = null;
                } else if (method === "mapMangledModule") {
                    const [code, mapper, includeBlacklistedExports] = args;

                    result = Webpack.mapMangledModule(code, mapper, includeBlacklistedExports);
                    if (Object.keys(result).length !== Object.keys(mapper).length) throw new Error("Webpack Find Fail");
                } else {
                    result = Webpack[method](...args);
                }

                if (result == null || (result.$$vencordGetWrappedComponent != null && result.$$vencordGetWrappedComponent() == null)) throw new Error("Webpack Find Fail");
            } catch (e) {
                let logMessage = searchType;
                if (method === "find" || method === "proxyLazyWebpack" || method === "LazyComponentWebpack") {
                    if (args[0].$$vencordProps != null) {
                        logMessage += `(${args[0].$$vencordProps.map(arg => `"${arg}"`).join(", ")})`;
                    } else {
                        logMessage += `(${args[0].toString().slice(0, 147)}...)`;
                    }
                } else if (method === "extractAndLoadChunks") {
                    logMessage += `([${args[0].map(arg => `"${arg}"`).join(", ")}], ${args[1].toString()})`;
                } else if (method === "mapMangledModule") {
                    const failedMappings = Object.keys(args[1]).filter(key => result?.[key] == null);

                    logMessage += `("${args[0]}", {\n${failedMappings.map(mapping => `\t${mapping}: ${args[1][mapping].toString().slice(0, 147)}...`).join(",\n")}\n})`;
                } else {
                    logMessage += `(${args.map(arg => `"${arg}"`).join(", ")})`;
                }

                ReporterLogger.log("Webpack Find Fail:", logMessage);
            }
        }

        ReporterLogger.log("Finished test");
    } catch (e) {
        ReporterLogger.log("A fatal error occurred:", e);
    }
}

// Run after the Vencord object has been created.
// We need to add extra properties to it, and it is only created after all of Vencord code has ran
setTimeout(runReporter, 0);

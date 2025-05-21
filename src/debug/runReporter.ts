/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import * as Webpack from "@webpack";
import { getBuildNumber, patchTimings } from "@webpack/patcher";

import { addPatch, patches } from "../plugins";
import { loadLazyChunks } from "./loadLazyChunks";

async function runReporter() {
    const ReporterLogger = new Logger("Reporter");

    try {
        ReporterLogger.log("Starting test...");

        const { promise: loadLazyChunksDone, resolve: loadLazyChunksResolve } = Promise.withResolvers<void>();

        // The main patch for starting the reporter chunk loading
        addPatch({
            find: '"Could not find app-mount"',
            replacement: {
                match: /(?<="use strict";)/,
                replace: "Vencord.Webpack._initReporter();"
            }
        }, "Vencord Reporter");

        // @ts-ignore
        Vencord.Webpack._initReporter = function () {
            // initReporter is called in the patched entry point of Discord
            // setImmediate to only start searching for lazy chunks after Discord initialized the app
            setTimeout(() => loadLazyChunks().then(loadLazyChunksResolve), 0);
        };

        await loadLazyChunksDone;

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

        for (const [plugin, moduleId, match, totalTime] of patchTimings) {
            if (totalTime > 5) {
                new Logger("WebpackPatcher").warn(`Patch by ${plugin} took ${Math.round(totalTime * 100) / 100}ms (Module id is ${String(moduleId)}): ${match}`);
            }
        }

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
                    // @ts-ignore
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

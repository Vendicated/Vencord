/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import * as Webpack from "@webpack";
import { patches } from "plugins";
import { initWs } from "plugins/devCompanion/initWs";

import { loadLazyChunks } from "./loadLazyChunks";
import { reporterData } from "./reporterData";

const ReporterLogger = new Logger("Reporter");
async function runReporter() {
    try {
        ReporterLogger.log("Starting test...");

        let loadLazyChunksResolve: (value: void | PromiseLike<void>) => void;
        const loadLazyChunksDone = new Promise<void>(r => loadLazyChunksResolve = r);

        Webpack.beforeInitListeners.add(() => loadLazyChunks().then((loadLazyChunksResolve)));
        await loadLazyChunksDone;

        for (const patch of patches) {
            if (!patch.all) {
                new Logger("WebpackInterceptor").warn(`Patch by ${patch.plugin} found no module (Module id is -): ${patch.find}`);
                if (IS_COMPANION_TEST)
                    reporterData.failedPatches.foundNoModule.push(patch);
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
            if (searchType === "waitForStore" && args[0] === "PermissionStore") continue;

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
                    const [code, mapper] = args;

                    result = Webpack.mapMangledModule(code, mapper);
                    if (Object.keys(result).length !== Object.keys(mapper).length) throw new Error("Webpack Find Fail");
                } else {
                    // @ts-ignore
                    result = Webpack[method](...args);
                }

                if (result == null || (result.$$vencordInternal != null && result.$$vencordInternal() == null)) throw new Error("Webpack Find Fail");
            } catch (e) {
                let logMessage = searchType;
                if (method === "find" || method === "proxyLazyWebpack" || method === "LazyComponentWebpack") logMessage += `(${args[0].toString().slice(0, 147)}...)`;
                else if (method === "extractAndLoadChunks") logMessage += `([${args[0].map(arg => `"${arg}"`).join(", ")}], ${args[1].toString()})`;
                else if (method === "mapMangledModule") {
                    const failedMappings = Object.keys(args[1]).filter(key => result?.[key] == null);

                    logMessage += `("${args[0]}", {\n${failedMappings.map(mapping => `\t${mapping}: ${args[1][mapping].toString().slice(0, 147)}...`).join(",\n")}\n})`;
                }
                else logMessage += `(${args.map(arg => `"${arg}"`).join(", ")})`;
                if (IS_COMPANION_TEST)
                    reporterData.failedWebpack[method].push(args.map(a => String(a)));
                ReporterLogger.log("Webpack Find Fail:", logMessage);
            }
        }

        // if we are running the reporter with companion integration, send the list to vscode as soon as we can
        if (IS_COMPANION_TEST)
            initWs();
        ReporterLogger.log("Finished test");
    } catch (e) {
        ReporterLogger.log("A fatal error occurred:", e);
    }
}

// imported in webpack for reporterData, wrap to avoid running reporter
if (IS_REPORTER)
    runReporter();

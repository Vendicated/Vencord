/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SYM_LAZY_COMPONENT_INNER } from "@utils/lazyReact";
import { Logger } from "@utils/Logger";
import { SYM_PROXY_INNER_GET, SYM_PROXY_INNER_VALUE } from "@utils/proxyInner";
import * as Webpack from "@webpack";
import { addPatch, patches } from "plugins";

import { loadLazyChunks } from "./loadLazyChunks";

const ReporterLogger = new Logger("Reporter");

async function runReporter() {
    try {
        ReporterLogger.log("Starting test...");

        let loadLazyChunksResolve: (value: void | PromiseLike<void>) => void;
        const loadLazyChunksDone = new Promise<void>(r => loadLazyChunksResolve = r);

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
            setTimeout(async () => {
                loadLazyChunks().then(loadLazyChunksResolve);
            }, 0);
        };

        await loadLazyChunksDone;

        for (const patch of patches) {
            if (!patch.all) {
                new Logger("WebpackInterceptor").warn(`Patch by ${patch.plugin} found no module (Module id is -): ${patch.find}`);
            }
        }

        for (const [plugin, moduleId, match, totalTime] of Vencord.WebpackPatcher.patchTimings) {
            if (totalTime > 3) {
                new Logger("WebpackInterceptor").warn(`Patch by ${plugin} took ${totalTime}ms (Module id is ${String(moduleId)}): ${match}`);
            }
        }

        await Promise.all(Webpack.webpackSearchHistory.map(async ([searchType, args]) => {
            args = [...args];

            let result = null as any;
            try {
                switch (searchType) {
                    case "webpackDependantLazy":
                    case "webpackDependantLazyComponent": {
                        const [factory] = args;
                        result = factory();
                        break;
                    }
                    case "extractAndLoadChunks": {
                        const extractAndLoadChunks = args.shift();

                        result = await extractAndLoadChunks();
                        if (result === false) {
                            result = null;
                        }

                        break;
                    }
                    default: {
                        const findResult = args.shift();

                        if (findResult != null) {
                            if (findResult.$$vencordCallbackCalled != null && findResult.$$vencordCallbackCalled()) {
                                result = findResult;
                                break;
                            }

                            if (findResult[SYM_PROXY_INNER_GET] != null) {
                                result = findResult[SYM_PROXY_INNER_VALUE];

                                break;
                            }

                            if (findResult[SYM_LAZY_COMPONENT_INNER] != null) {
                                result = findResult[SYM_LAZY_COMPONENT_INNER]();
                                break;
                            }

                            if (searchType === "mapMangledModule") {
                                result = findResult;

                                for (const innerMap in result) {
                                    if (result[innerMap][SYM_PROXY_INNER_GET] != null && result[innerMap][SYM_PROXY_INNER_VALUE] == null) {
                                        throw new Error("Webpack Find Fail");
                                    } else if (result[innerMap][SYM_LAZY_COMPONENT_INNER] != null && result[innerMap][SYM_LAZY_COMPONENT_INNER]() == null) {
                                        throw new Error("Webpack Find Fail");
                                    }
                                }
                            }

                            // This can happen if a `find` was immediately found
                            result = findResult;
                        }

                        break;
                    }
                }

                if (result == null) {
                    throw new Error("Webpack Find Fail");
                }
            } catch (e) {
                let logMessage = searchType;

                let filterName = "";
                let parsedArgs = args;

                if (args[0].$$vencordProps != null) {
                    if (["find", "findComponent", "waitFor"].includes(searchType)) {
                        filterName = args[0].$$vencordProps[0];
                    }

                    parsedArgs = args[0].$$vencordProps.slice(1);
                }

                function stringifyCodeFilter(code: string | RegExp | Webpack.CodeFilter) {
                    if (Array.isArray(code)) {
                        return `[${code.map(arg => arg instanceof RegExp ? String(arg) : JSON.stringify(arg)).join(", ")}]`;
                    }

                    return code instanceof RegExp ? String(code) : JSON.stringify(code);
                }

                // if parsedArgs is the same as args, it means vencordProps of the filter was not available (like in normal filter functions),
                // so log the filter function instead
                if (
                    parsedArgs === args &&
                    ["waitFor", "find", "findComponent", "webpackDependantLazy", "webpackDependantLazyComponent"].includes(searchType)
                ) {
                    let filter = String(parsedArgs[0]);
                    if (filter.length > 150) {
                        filter = filter.slice(0, 147) + "...";
                    }

                    logMessage += `(${filter})`;
                } else if (searchType === "extractAndLoadChunks") {
                    const [code, matcher] = parsedArgs;

                    let regexStr: string;
                    if (matcher === Webpack.DefaultExtractAndLoadChunksRegex) {
                        regexStr = "DefaultExtractAndLoadChunksRegex";
                    } else {
                        regexStr = String(matcher);
                    }

                    logMessage += `(${stringifyCodeFilter(code)}, ${regexStr})`;
                } else if (searchType === "mapMangledModule") {
                    const [code, mappers] = parsedArgs;

                    const parsedFailedMappers = Object.entries<any>(mappers)
                        .filter(([key]) =>
                            result == null ||
                            (result[key]?.[SYM_PROXY_INNER_GET] != null && result[key][SYM_PROXY_INNER_VALUE] == null) ||
                            (result[key]?.[SYM_LAZY_COMPONENT_INNER] != null && result[key][SYM_LAZY_COMPONENT_INNER]() == null)
                        )
                        .map(([key, filter]) => {
                            let parsedFilter: string;

                            if (filter.$$vencordProps != null) {
                                const filterName = filter.$$vencordProps[0];
                                parsedFilter = `${filterName}(${filter.$$vencordProps.slice(1).map((arg: any) => arg instanceof RegExp ? String(arg) : JSON.stringify(arg)).join(", ")})`;
                            } else {
                                parsedFilter = String(filter);
                                if (parsedFilter.length > 150) {
                                    parsedFilter = parsedFilter.slice(0, 147) + "...";
                                }
                            }

                            return [key, parsedFilter];
                        });

                    logMessage += `(${stringifyCodeFilter(code)}, {\n${parsedFailedMappers.map(([key, parsedFilter]) => `\t${key}: ${parsedFilter}`).join(",\n")}\n})`;
                } else {
                    logMessage += `(${filterName.length ? `${filterName}(` : ""}${parsedArgs.map(arg => arg instanceof RegExp ? String(arg) : JSON.stringify(arg)).join(", ")})${filterName.length ? ")" : ""}`;
                }

                ReporterLogger.log("Webpack Find Fail:", logMessage);
            }
        }));

        ReporterLogger.log("Finished test");
    } catch (e) {
        ReporterLogger.log("A fatal error occurred:", e);
    }
}

// Run after the Vencord object has been created
setTimeout(runReporter, 0);

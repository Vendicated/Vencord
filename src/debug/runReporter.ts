/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { canonicalizeMatch } from "@utils/patches";
import { SYM_PROXY_INNER_GET, SYM_PROXY_INNER_VALUE } from "@utils/proxyInner";
import * as Webpack from "@webpack";
import { wreq } from "@webpack";
import { addPatch, patches } from "plugins";

const ReporterLogger = new Logger("Reporter");

async function runReporter() {
    ReporterLogger.log("Starting test...");

    try {
        // Enable eagerPatches to make all patches apply regardless of the module being required
        Settings.eagerPatches = true;

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
            setTimeout(() => {
                ReporterLogger.log("Loading all chunks...");

                Webpack.factoryListeners.add(factory => {
                    // setImmediate to avoid blocking the factory patching execution while checking for lazy chunks
                    setTimeout(() => {
                        let isResolved = false;
                        searchAndLoadLazyChunks(String(factory))
                            .then(() => isResolved = true)
                            .catch(() => isResolved = true);

                        chunksSearchPromises.push(() => isResolved);
                    }, 0);
                });

                for (const factoryId in wreq.m) {
                    let isResolved = false;
                    searchAndLoadLazyChunks(String(wreq.m[factoryId]))
                        .then(() => isResolved = true)
                        .catch(() => isResolved = true);

                    chunksSearchPromises.push(() => isResolved);
                }
            }, 0);
        };

        const validChunks = new Set<string>();
        const invalidChunks = new Set<string>();
        const deferredRequires = new Set<string>();

        let chunksSearchingResolve: (value: void | PromiseLike<void>) => void;
        const chunksSearchingDone = new Promise<void>(r => chunksSearchingResolve = r);

        // True if resolved, false otherwise
        const chunksSearchPromises = [] as Array<() => boolean>;

        const LazyChunkRegex = canonicalizeMatch(/(?:(?:Promise\.all\(\[)?(\i\.e\("[^)]+?"\)[^\]]*?)(?:\]\))?)\.then\(\i\.bind\(\i,"([^)]+?)"\)\)/g);

        async function searchAndLoadLazyChunks(factoryCode: string) {
            const lazyChunks = factoryCode.matchAll(LazyChunkRegex);
            const validChunkGroups = new Set<[chunkIds: string[], entryPoint: string]>();

            // Workaround for a chunk that depends on the ChannelMessage component but may be be force loaded before
            // the chunk containing the component
            const shouldForceDefer = factoryCode.includes(".Messages.GUILD_FEED_UNFEATURE_BUTTON_TEXT");

            await Promise.all(Array.from(lazyChunks).map(async ([, rawChunkIds, entryPoint]) => {
                const chunkIds = rawChunkIds ? Array.from(rawChunkIds.matchAll(Webpack.ChunkIdsRegex)).map(m => m[1]) : [];

                if (chunkIds.length === 0) {
                    return;
                }

                let invalidChunkGroup = false;

                for (const id of chunkIds) {
                    if (wreq.u(id) == null || wreq.u(id) === "undefined.js") continue;

                    const isWasm = await fetch(wreq.p + wreq.u(id))
                        .then(r => r.text())
                        .then(t => (IS_WEB && t.includes(".module.wasm")) || !t.includes("(this.webpackChunkdiscord_app=this.webpackChunkdiscord_app||[]).push"));

                    if (isWasm && IS_WEB) {
                        invalidChunks.add(id);
                        invalidChunkGroup = true;
                        continue;
                    }

                    validChunks.add(id);
                }

                if (!invalidChunkGroup) {
                    validChunkGroups.add([chunkIds, entryPoint]);
                }
            }));

            // Loads all found valid chunk groups
            await Promise.all(
                Array.from(validChunkGroups)
                    .map(([chunkIds]) =>
                        Promise.all(chunkIds.map(id => wreq.e(id)))
                    )
            );

            // Requires the entry points for all valid chunk groups
            for (const [, entryPoint] of validChunkGroups) {
                try {
                    if (shouldForceDefer) {
                        deferredRequires.add(entryPoint);
                        continue;
                    }

                    if (wreq.m[entryPoint]) wreq(entryPoint);
                } catch (err) {
                    console.error(err);
                }
            }

            // setImmediate to only check if all chunks were loaded after this function resolves
            // We check if all chunks were loaded every time a factory is loaded
            // If we are still looking for chunks in the other factories, the array will have that factory's chunk search promise not resolved
            // But, if all chunk search promises are resolved, this means we found every lazy chunk loaded by Discord code and manually loaded them
            setTimeout(() => {
                let allResolved = true;

                for (let i = 0; i < chunksSearchPromises.length; i++) {
                    const isResolved = chunksSearchPromises[i]();

                    if (isResolved) {
                        // Remove finished promises to avoid having to iterate through a huge array everytime
                        chunksSearchPromises.splice(i--, 1);
                    } else {
                        allResolved = false;
                    }
                }

                if (allResolved) chunksSearchingResolve();
            }, 0);
        }

        await chunksSearchingDone;

        // Require deferred entry points
        for (const deferredRequire of deferredRequires) {
            wreq(deferredRequire as any);
        }

        // All chunks Discord has mapped to asset files, even if they are not used anymore
        const allChunks = [] as string[];

        // Matches "id" or id:
        for (const currentMatch of String(wreq.u).matchAll(/(?:"(\d+?)")|(?:(\d+?):)/g)) {
            const id = currentMatch[1] ?? currentMatch[2];
            if (id == null) continue;

            allChunks.push(id);
        }

        if (allChunks.length === 0) throw new Error("Failed to get all chunks");

        // Chunks that are not loaded (not used) by Discord code anymore
        const chunksLeft = allChunks.filter(id => {
            return !(validChunks.has(id) || invalidChunks.has(id));
        });

        await Promise.all(chunksLeft.map(async id => {
            const isWasm = await fetch(wreq.p + wreq.u(id))
                .then(r => r.text())
                .then(t => (IS_WEB && t.includes(".module.wasm")) || !t.includes("(this.webpackChunkdiscord_app=this.webpackChunkdiscord_app||[]).push"));

            // Loads and requires a chunk
            if (!isWasm) {
                await wreq.e(id);
                if (wreq.m[id]) wreq(id);
            }
        }));

        ReporterLogger.log("Finished loading all chunks!");

        for (const patch of patches) {
            if (!patch.all) {
                new Logger("WebpackInterceptor").warn(`Patch by ${patch.plugin} found no module (Module id is -): ${patch.find}`);
            }
        }
        await Promise.all(Webpack.webpackSearchHistory.map(async ([searchType, args]) => {
            args = [...args];

            try {
                let result = null as any;

                switch (searchType) {
                    case "webpackDependantLazy":
                    case "webpackDependantLazyComponent": {
                        const [factory] = args;
                        result = factory();
                        break;
                    }
                    case "extractAndLoadChunks": {
                        const [code, matcher] = args;

                        result = await Webpack.extractAndLoadChunks(code, matcher);
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
                            }

                            if (findResult[SYM_PROXY_INNER_GET] != null) {
                                result = findResult[SYM_PROXY_INNER_VALUE];
                            }

                            if (findResult.$$vencordInner != null) {
                                result = findResult.$$vencordInner();
                            }
                        }

                        break;
                    }
                }

                if (result == null) {
                    throw "a rock at ben shapiro";
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
                    let regexStr: string;
                    if (parsedArgs[1] === Webpack.DefaultExtractAndLoadChunksRegex) {
                        regexStr = "DefaultExtractAndLoadChunksRegex";
                    } else {
                        regexStr = String(parsedArgs[1]);
                    }

                    logMessage += `([${parsedArgs[0].map((arg: any) => `"${arg}"`).join(", ")}], ${regexStr})`;
                } else {
                    logMessage += `(${filterName.length ? `${filterName}(` : ""}${parsedArgs.map(arg => `"${arg}"`).join(", ")})${filterName.length ? ")" : ""}`;
                }

                ReporterLogger.log("Webpack Find Fail:", logMessage);
            }
        }));

        ReporterLogger.log("Finished test");
    } catch (e) {
        ReporterLogger.log("A fatal error occurred:", e);
    }
}

runReporter();

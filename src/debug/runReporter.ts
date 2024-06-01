/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { canonicalizeMatch } from "@utils/patches";
import { SYM_PROXY_INNER_GET, SYM_PROXY_INNER_VALUE } from "@utils/proxyInner";
import * as Webpack from "@webpack";
import { wreq } from "@webpack";
import { patches } from "plugins";

const ReporterLogger = new Logger("Reporter");

async function runReporter() {
    ReporterLogger.log("Starting test...");

    try {
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
                        Promise.all(chunkIds.map(id => wreq.e(id as any).catch(() => { })))
                    )
            );

            // Requires the entry points for all valid chunk groups
            for (const [, entryPoint] of validChunkGroups) {
                try {
                    if (shouldForceDefer) {
                        deferredRequires.add(entryPoint);
                        continue;
                    }

                    if (wreq.m[entryPoint]) wreq(entryPoint as any);
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

        Webpack.beforeInitListeners.add(async () => {
            ReporterLogger.log("Loading all chunks...");

            Webpack.factoryListeners.add(factory => {
                let isResolved = false;
                searchAndLoadLazyChunks(factory.toString()).then(() => isResolved = true);

                chunksSearchPromises.push(() => isResolved);
            });

            // setImmediate to only search the initial factories after Discord initialized the app
            // our beforeInitListeners are called before Discord initializes the app
            setTimeout(() => {
                for (const factoryId in wreq.m) {
                    let isResolved = false;
                    searchAndLoadLazyChunks(wreq.m[factoryId].toString()).then(() => isResolved = true);

                    chunksSearchPromises.push(() => isResolved);
                }
            }, 0);
        });

        await chunksSearchingDone;

        // Require deferred entry points
        for (const deferredRequire of deferredRequires) {
            wreq!(deferredRequire as any);
        }

        // All chunks Discord has mapped to asset files, even if they are not used anymore
        const allChunks = [] as string[];

        // Matches "id" or id:
        for (const currentMatch of wreq!.u.toString().matchAll(/(?:"(\d+?)")|(?:(\d+?):)/g)) {
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
                await wreq.e(id as any);
                if (wreq.m[id]) wreq(id as any);
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
                    let filter = parsedArgs[0].toString();
                    if (filter.length > 150) {
                        filter = filter.slice(0, 147) + "...";
                    }

                    logMessage += `(${filter})`;
                } else if (searchType === "extractAndLoadChunks") {
                    let regexStr: string;
                    if (parsedArgs[1] === Webpack.DefaultExtractAndLoadChunksRegex) {
                        regexStr = "DefaultExtractAndLoadChunksRegex";
                    } else {
                        regexStr = parsedArgs[1].toString();
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

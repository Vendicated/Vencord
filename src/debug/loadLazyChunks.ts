/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { ModuleFactory } from "@vencord/discord-types/webpack";
import * as Webpack from "@webpack";
import { wreq } from "@webpack";
import { AnyModuleFactory } from "@webpack/types";
import pLimit from "p-limit";

function getWebpackChunkMap() {
    const sym = Symbol();
    let chunksMap: unknown = null;

    Object.defineProperty(Object.prototype, sym, {
        get() {
            chunksMap = this;
            return "";
        },
        configurable: true
    });

    wreq.u(sym);
    delete Object.prototype[sym];

    return chunksMap as Record<PropertyKey, string> | null;
}

let chunksAlreadyLoaded = false;

export async function loadLazyChunks() {
    const LazyChunkLoaderLogger = new Logger("LazyChunkLoader");

    if (chunksAlreadyLoaded) {
        LazyChunkLoaderLogger.log("Lazy chunks have already been loaded");
        return;
    }

    const queue = pLimit(50);
    const WORKER_ASSET_REGEX = /importScripts\(|self\.postMessage/;
    // Chunks whose first module is a JSON module. Discord bundles JSON modules in their own chunks, so these only contain data
    const JSON_CHUNK_REGEX = /^[^{]*\{[^{]*\{[\w$]+\.exports=JSON\.parse\('/;

    // wreq.u rebuilds an object containing every chunk on each call, so it is very slow to call repeatedly
    const chunkFileNameCache = new Map<PropertyKey, string>();
    function getChunkFileName(id: PropertyKey) {
        let fileName = chunkFileNameCache.get(id);
        if (fileName == null) chunkFileNameCache.set(id, fileName = wreq.u(id));
        return fileName;
    }

    // The same chunks are loaded by many factories, avoid going through wreq.e more than once for each
    const chunkLoads = new Map<PropertyKey, Promise<unknown>>();
    function loadChunk(id: PropertyKey) {
        let promise = chunkLoads.get(id);
        if (promise == null) chunkLoads.set(id, promise = wreq.e(id));
        return promise;
    }

    try {
        LazyChunkLoaderLogger.log("Loading all chunks...");

        const validChunks = new Set<PropertyKey>();
        const invalidChunks = new Set<PropertyKey>();
        const deferredRequires = new Set<PropertyKey>();

        const { promise: chunkSearchingDone, resolve: chunkSearchingDoneResolve } = Promise.withResolvers<void>();

        // Amount of factories which are still being searched, or which still have their found chunks loading
        let pendingSearches = 0;

        // This regex loads all language packs which makes webpack finds testing extremely slow, so for now, we prioritize using the one which doesn't include those
        const ChunkLoader = String.raw`[A-Za-z_$][\w$]*\.e\("[^"]+"\)`;
        const Identifier = String.raw`[A-Za-z_$][\w$]*`;
        const PromiseAllChunkLoad = String.raw`Promise\.all\(\[((?:${ChunkLoader},?)+)\]\)`;
        const CompleteThen = String.raw`\.then\(${Identifier}(?:\.${Identifier})?\.bind\(${Identifier},"?([^)]+?)"?(?:,[^)]+?)?\)\)`;
        const PartialThen = String.raw`\.then\(${Identifier}\.bind\(${Identifier},"?([^)]+?)"?\)\)`;
        const CompletePromiseRegex = new RegExp(`${PromiseAllChunkLoad}${CompleteThen}`, "y");
        const CompleteSingleRegex = new RegExp(`(${ChunkLoader})${CompleteThen}`, "y");
        const PartialPromiseRegex = new RegExp(`${PromiseAllChunkLoad}${PartialThen}`, "y");
        const PartialSingleRegex = new RegExp(`(${ChunkLoader})${PartialThen}`, "y");

        function findLazyChunkMatches(factoryCode: string, complete: boolean) {
            const promiseRegex = complete ? CompletePromiseRegex : PartialPromiseRegex;
            const singleRegex = complete ? CompleteSingleRegex : PartialSingleRegex;
            const matches: RegExpMatchArray[] = [];

            let index = 0;
            while ((index = factoryCode.indexOf("Promise.all([", index)) !== -1) {
                promiseRegex.lastIndex = index;
                const match = promiseRegex.exec(factoryCode);
                if (match) matches.push(match);
                index++;
            }

            index = 0;
            while ((index = factoryCode.indexOf('.e("', index)) !== -1) {
                let start = index;
                while (start > 0 && /[\w$]/.test(factoryCode[start - 1])) start--;

                if (start < index && /[A-Za-z_$]/.test(factoryCode[start])) {
                    singleRegex.lastIndex = start;
                    const match = singleRegex.exec(factoryCode);
                    if (match) matches.push(match);
                }

                index += 4;
            }

            return matches.sort((a, b) => a.index! - b.index!);
        }

        let foundCssDebuggingLoad = false;

        async function searchAndLoadLazyChunks(factoryCode: string) {
            // Workaround to avoid loading the CSS debugging chunk which turns the app pink
            // const hasCssDebuggingLoad = foundCssDebuggingLoad ? false : (foundCssDebuggingLoad = factoryCode.includes(".cssDebuggingEnabled&&"));

            // Disabled for now since this causes lots of chunks concatenated into the same module to get marked as invalid, and thus not loaded.
            const hasCssDebuggingLoad = foundCssDebuggingLoad = false;

            const lazyChunks = findLazyChunkMatches(factoryCode, hasCssDebuggingLoad);
            const validChunkGroups = new Set<[chunkIds: PropertyKey[], entryPoint: PropertyKey]>();

            for (const [, rawChunkIds, entryPoint] of lazyChunks) {
                const chunkIds = rawChunkIds
                    ?.matchAll(Webpack.ChunkIdsRegex)
                    .map(m => {
                        const numChunkId = Number(m[1]);
                        return Number.isNaN(numChunkId) ? m[1] : String(numChunkId);
                    })
                    .toArray()
                    ?? [];

                if (chunkIds.length === 0) {
                    continue;
                }

                let invalidChunkGroup = false;

                for (const id of chunkIds) {
                    if (hasCssDebuggingLoad) {
                        if (chunkIds.length > 1) {
                            throw new Error("Found multiple chunks in factory that loads the CSS debugging chunk");
                        }

                        invalidChunks.add(id);
                        invalidChunkGroup = true;
                        break;
                    }

                    const chunkFileName = getChunkFileName(id);
                    if (chunkFileName == null || chunkFileName === "undefined.js") continue;

                    validChunks.add(id);
                }

                if (!invalidChunkGroup) {
                    const numEntryPoint = Number(entryPoint);
                    validChunkGroups.add([chunkIds, Number.isNaN(numEntryPoint) ? entryPoint : String(numEntryPoint)]);
                }
            }

            // Loads all found valid chunk groups
            await Promise.all(
                Array.from(validChunkGroups)
                    .map(([chunkIds]) =>
                        Promise.all(chunkIds.map(loadChunk))
                    )
            );

            for (const [, entryPoint] of validChunkGroups) {
                deferredRequires.add(entryPoint);
            }
        }

        function factoryListener(factory: AnyModuleFactory | ModuleFactory) {
            pendingSearches++;
            searchAndLoadLazyChunks(String(factory))
                .finally(() => {
                    // Factories from the chunks loaded by this search are added before the chunk loading resolves, so their searches are already pending at this point.
                    // If no searches are pending, our regex has finished scanning all modules and every chunk it found has been loaded.
                    if (--pendingSearches === 0) chunkSearchingDoneResolve();
                });
        }

        Webpack.factoryListeners.add(factoryListener);
        for (const moduleId in wreq.m) {
            factoryListener(wreq.m[moduleId]);
        }

        await chunkSearchingDone;
        Webpack.factoryListeners.delete(factoryListener);

        // All chunks Discord has mapped to asset files, even if they are not used anymore
        const chunksMap = getWebpackChunkMap();
        if (!chunksMap) throw new Error("Failed to get chunk map");

        const allChunks = Object.keys(chunksMap);
        if (allChunks.length === 0) throw new Error("Failed to get all chunks");

        // Chunks which our regex could not catch to load
        // It will always contain WebWorker assets, and also currently contains language packs and other JSON data which are loaded differently
        const chunksLeft = allChunks.filter(id => {
            return !(validChunks.has(id) || invalidChunks.has(id));
        });

        await Promise.all(chunksLeft.map(id => queue(async () => {
            const chunkCode = await fetch(wreq.p + getChunkFileName(id)).then(r => r.text());

            // JSON chunks only contain data, so there is nothing to patch in them. Loading them makes webpack finds testing extremely slow
            if (JSON_CHUNK_REGEX.test(chunkCode) || WORKER_ASSET_REGEX.test(chunkCode)) return;

            await loadChunk(id);
        })));

        // Entry points are only required once every chunk is loaded. Some lazy loads omit chunks which Discord expects to be loaded already in that context,
        // so requiring them right after their own chunks load can fail and error
        for (const deferredRequire of deferredRequires) {
            try {
                if (wreq.m[deferredRequire]) wreq(deferredRequire);
            } catch (err) {
                if (err instanceof TypeError && err.message.includes("reading 'nativeModules'")) {
                    continue;
                }

                console.error(err);
            }
        }

        LazyChunkLoaderLogger.log("Finished loading all chunks!");
        chunksAlreadyLoaded = true;
    } catch (e) {
        LazyChunkLoaderLogger.log("A fatal error occurred:", e);
    }
}

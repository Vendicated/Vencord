/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { canonicalizeMatch } from "@utils/patches";
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
    const workerAssetCache = new Map<string, Promise<boolean>>();
    const WORKER_ASSET_REGEX = /importScripts\(|self\.postMessage/;

    async function isWorkerAsset(url: string, useQueue: boolean = true): Promise<boolean> {
        if (workerAssetCache.has(url)) {
            return workerAssetCache.get(url)!;
        }

        const doFetch = () => {
            return fetch(url)
                .then(r => r.text())
                .then(t => WORKER_ASSET_REGEX.test(t));
        };

        const res = useQueue
            ? queue(doFetch)
            : doFetch();

        workerAssetCache.set(url, res);
        return res;
    }

    try {
        LazyChunkLoaderLogger.log("Loading all chunks...");

        const validChunks = new Set<PropertyKey>();
        const invalidChunks = new Set<PropertyKey>();
        const deferredRequires = new Set<PropertyKey>();

        const { promise: chunkSearchingDone, resolve: chunkSearchingDoneResolve } = Promise.withResolvers<void>();

        // True if searching promise for that chunk is resolved, false otherwise
        let chunkSearchResolvedGetters = [] as Array<() => boolean>;

        // This regex loads all language packs which makes webpack finds testing extremely slow, so for now, we prioritize using the one which doesn't include those
        const CompleteLazyChunkRegex = canonicalizeMatch(/(?:(?:Promise\.all\(\[)?((?:\i\.e\("?[^)]+?"?\),?)+?)(?:\]\))?)\.then\(\i(?:\.\i)?\.bind\(\i,"?([^)]+?)"?(?:,[^)]+?)?\)\)/g);
        const PartialLazyChunkRegex = canonicalizeMatch(/(?:(?:Promise\.all\(\[)?((?:\i\.e\("?[^)]+?"?\),?)+?)(?:\]\))?)\.then\(\i\.bind\(\i,"?([^)]+?)"?\)\)/g);

        let foundCssDebuggingLoad = false;

        async function searchAndLoadLazyChunks(factoryCode: string) {
            // Workaround to avoid loading the CSS debugging chunk which turns the app pink
            // const hasCssDebuggingLoad = foundCssDebuggingLoad ? false : (foundCssDebuggingLoad = factoryCode.includes(".cssDebuggingEnabled&&"));

            // Disabled for now since this causes lots of chunks concatenated into the same module to get marked as invalid, and thus not loaded.
            const hasCssDebuggingLoad = foundCssDebuggingLoad = false;

            const lazyChunks = factoryCode.matchAll(hasCssDebuggingLoad ? CompleteLazyChunkRegex : PartialLazyChunkRegex);
            const validChunkGroups = new Set<[chunkIds: PropertyKey[], entryPoint: PropertyKey]>();

            const shouldForceDefer = false;

            await Promise.all(Array.from(lazyChunks).map(async ([, rawChunkIds, entryPoint]) => {
                const chunkIds = rawChunkIds
                    ?.matchAll(Webpack.ChunkIdsRegex)
                    .map(m => {
                        const numChunkId = Number(m[1]);
                        return Number.isNaN(numChunkId) ? m[1] : String(numChunkId);
                    })
                    .toArray()
                    ?? [];

                if (chunkIds.length === 0) {
                    return;
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

                    if (wreq.u(id) == null || wreq.u(id) === "undefined.js") continue;

                    if (await isWorkerAsset(wreq.p + wreq.u(id))) {
                        invalidChunks.add(id);
                        invalidChunkGroup = true;
                        continue;
                    }

                    validChunks.add(id);
                }

                if (!invalidChunkGroup) {
                    const numEntryPoint = Number(entryPoint);
                    validChunkGroups.add([chunkIds, Number.isNaN(numEntryPoint) ? entryPoint : String(numEntryPoint)]);
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
                    if (err instanceof TypeError && err.message.includes("reading 'nativeModules'")) {
                        continue;
                    }

                    console.error(err);
                }
            }


            // Filter out resolved chunk search promises. If the array length is 0 that means all the pending searches and loadings are done
            // and our regex has finished scanning all modules. Once this happens, the artificial "natural" loading of chunks has been completed
            // and we can continue with the rest of the code.
            // setImmediate here is needed so the filtering also includes the promises created from searching the modules loaded by the current invokation.
            // Otherwise, it could resolve before the async code being put at the end of the event loop has a chance to run and add the promise to the array.
            // The async code mentioned is the invokation of the current function from the factoryListener.
            setTimeout(() => {
                chunkSearchResolvedGetters = chunkSearchResolvedGetters.filter(isResolvedGetter => !isResolvedGetter());
                if (chunkSearchResolvedGetters.length === 0) {
                    chunkSearchingDoneResolve();
                }
            }, 0);
        }

        function factoryListener(factory: AnyModuleFactory | ModuleFactory) {
            let isResolved = false;
            searchAndLoadLazyChunks(String(factory))
                .finally(() => isResolved = true);

            chunkSearchResolvedGetters.push(() => isResolved);
        }

        Webpack.factoryListeners.add(factoryListener);
        for (const moduleId in wreq.m) {
            factoryListener(wreq.m[moduleId]);
        }

        await chunkSearchingDone;
        Webpack.factoryListeners.delete(factoryListener);

        // Require deferred entry points
        for (const deferredRequire of deferredRequires) {
            wreq(deferredRequire);
        }

        // All chunks Discord has mapped to asset files, even if they are not used anymore
        const chunksMap = getWebpackChunkMap();
        if (!chunksMap) throw new Error("Failed to get chunk map");

        const allChunks = Object.keys(chunksMap);
        if (allChunks.length === 0) throw new Error("Failed to get all chunks");

        // Chunks which our regex could not catch to load
        // It will always contain WebWorker assets, and also currently contains some language packs which are loaded differently
        const chunksLeft = allChunks.filter(id => {
            return !(validChunks.has(id) || invalidChunks.has(id));
        });

        await Promise.all(chunksLeft.map(async id => queue(async () => {
            // We will deadlock if we use the queue inside a queue func
            const isWorkerFile = await isWorkerAsset(wreq.p + wreq.u(id), false);

            if (!isWorkerFile) {
                await wreq.e(id);
            }
        })));

        LazyChunkLoaderLogger.log("Finished loading all chunks!");
        chunksAlreadyLoaded = true;
    } catch (e) {
        LazyChunkLoaderLogger.log("A fatal error occurred:", e);
    }
}

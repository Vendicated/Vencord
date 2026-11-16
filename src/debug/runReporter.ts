/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import * as Webpack from "@webpack";
import { getBuildNumber, patches } from "@webpack/patcher";

import { loadLazyChunks } from "./loadLazyChunks";
import { replayFinds } from "./replayFinds";

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

        const failures = await replayFinds(Webpack.lazyWebpackSearchHistory, Webpack);
        for (const failure of failures) {
            ReporterLogger.log("Webpack Find Fail:", failure.label);
        }

        ReporterLogger.log("Finished test");
    } catch (e) {
        ReporterLogger.log("A fatal error occurred:", e);
    }
}

// Run after the Vencord object has been created.
// We need to add extra properties to it, and it is only created after all of Vencord code has ran
setTimeout(runReporter, 0);

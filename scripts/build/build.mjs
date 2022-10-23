#!/usr/bin/node
/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import esbuild from "esbuild";

import { commonOpts, gitHash, globPlugins, isStandalone } from "./common.mjs";

const defines = {
    IS_STANDALONE: isStandalone
};
if (defines.IS_STANDALONE === "false")
    // If this is a local build (not standalone), optimise
    // for the specific platform we're on
    defines["process.platform"] = JSON.stringify(process.platform);

const header = `
// Vencord ${gitHash}
// Standalone: ${defines.IS_STANDALONE}
// Platform: ${defines["process.platform"] || "Universal"}
`.trim();

/**
 * @type {esbuild.BuildOptions}
 */
const nodeCommonOpts = {
    ...commonOpts,
    format: "cjs",
    platform: "node",
    target: ["esnext"],
    minify: true,
    bundle: true,
    external: ["electron", ...commonOpts.external],
    define: defines,
    banner: {
        js: header
    }
};

await Promise.all([
    esbuild.build({
        ...nodeCommonOpts,
        entryPoints: ["src/preload.ts"],
        outfile: "dist/preload.js",
        footer: { js: "//# sourceURL=VencordPreload\n//# sourceMappingURL=vencord://preload.js.map" },
        sourcemap: "external",
    }),
    esbuild.build({
        ...nodeCommonOpts,
        entryPoints: ["src/patcher.ts"],
        outfile: "dist/patcher.js",
        footer: { js: "//# sourceURL=VencordPatcher\n//# sourceMappingURL=vencord://patcher.js.map" },
        sourcemap: "external",
    }),
    esbuild.build({
        ...commonOpts,
        entryPoints: ["src/Vencord.ts"],
        outfile: "dist/renderer.js",
        format: "iife",
        target: ["esnext"],
        footer: { js: "//# sourceURL=VencordRenderer\n//# sourceMappingURL=vencord://renderer.js.map" },
        globalName: "Vencord",
        sourcemap: "external",
        plugins: [
            globPlugins,
            ...commonOpts.plugins
        ],
        define: {
            IS_WEB: "false",
            IS_STANDALONE: isStandalone
        }
    }),
]).catch(err => {
    console.error("Build failed");
    console.error(err.message);
    // make ci fail
    if (!commonOpts.watch)
        process.exitCode = 1;
});

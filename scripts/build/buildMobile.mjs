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

import { BUILD_TIMESTAMP, commonOpts, globPlugins, isDev, VERSION } from "./common.mjs";

/**
 * @type {esbuild.BuildOptions}
 */
const commonOptions = {
    ...commonOpts,
    entryPoints: ["browser/Vencord.ts"],
    globalName: "Vencord",
    format: "iife",
    external: ["plugins", "git-hash", "/assets/*"],
    plugins: [
        globPlugins("mobile"),
        ...commonOpts.plugins,
    ],
    target: ["esnext"],
    define: {
        IS_WEB: "true",
        IS_EXTENSION: "false",
        IS_STANDALONE: "true",
        IS_DEV: JSON.stringify(isDev),
        IS_DISCORD_DESKTOP: "false",
        IS_VESKTOP: "false",
        IS_UPDATER_DISABLED: "true",
        VERSION: JSON.stringify(VERSION),
        BUILD_TIMESTAMP,
    }
};

const MonacoWorkerEntryPoints = [
    "vs/language/css/css.worker.js",
    "vs/editor/editor.worker.js"
];

const RnNoiseFiles = [
    "dist/rnnoise.wasm",
    "dist/rnnoise_simd.wasm",
    "dist/rnnoise/workletProcessor.js",
    "LICENSE"
];

await Promise.all(
    [
        esbuild.build({
            entryPoints: MonacoWorkerEntryPoints.map(entry => `node_modules/monaco-editor/esm/${entry}`),
            bundle: true,
            minify: true,
            format: "iife",
            outbase: "node_modules/monaco-editor/esm/",
            outdir: "dist/monaco"
        }),
        esbuild.build({
            entryPoints: ["browser/monaco.ts"],
            bundle: true,
            minify: true,
            format: "iife",
            outfile: "dist/monaco/index.js",
            loader: {
                ".ttf": "file"
            }
        }),
        esbuild.build({
            ...commonOptions,
            outfile: "dist/mobile.js",
            footer: { js: "//# sourceURL=VencordWeb" },
        })
    ]
);

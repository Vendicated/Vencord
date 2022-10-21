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
import { commonOpts, gitHashPlugin, globPlugins, makeAllPackagesExternalPlugin } from "./common.mjs";

/**
 * @type {esbuild.BuildOptions}
 */
const nodeCommonOpts = {
    ...commonOpts,
    format: "cjs",
    platform: "node",
    target: ["esnext"],
    minify: true,
    sourcemap: "linked",
    plugins: [makeAllPackagesExternalPlugin],
};

await Promise.all([
    esbuild.build({
        ...nodeCommonOpts,
        entryPoints: ["src/preload.ts"],
        outfile: "dist/preload.js",
    }),
    esbuild.build({
        ...nodeCommonOpts,
        entryPoints: ["src/patcher.ts"],
        outfile: "dist/patcher.js",
    }),
    esbuild.build({
        ...commonOpts,
        entryPoints: ["src/Vencord.ts"],
        outfile: "dist/renderer.js",
        format: "iife",
        target: ["esnext"],
        footer: { js: "//# sourceURL=VencordRenderer" },
        globalName: "Vencord",
        external: ["plugins", "git-hash"],
        plugins: [
            globPlugins,
            gitHashPlugin
        ],
        define: {
            IS_WEB: "false"
        }
    }),
]).catch(err => {
    console.error("Build failed");
    console.error(err.message);
    // make ci fail
    if (!watch)
        process.exitCode = 1;
});

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
import { zip } from "fflate";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { copyFile, readFile } from "fs/promises";
import { join } from "path";

// wtf is this assert syntax
import PackageJSON from "../../package.json" assert { type: "json" };
import { commonOpts, fileIncludePlugin, gitHashPlugin, gitRemotePlugin, globPlugins, watch } from "./common.mjs";

/**
 * @type {esbuild.BuildOptions}
 */
const commonOptions = {
    ...commonOpts,
    entryPoints: ["browser/Vencord.ts"],
    globalName: "Vencord",
    format: "iife",
    external: ["plugins", "git-hash"],
    plugins: [
        globPlugins,
        gitHashPlugin,
        gitRemotePlugin,
        fileIncludePlugin
    ],
    target: ["esnext"],
    define: {
        IS_WEB: "true",
        IS_STANDALONE: "true",
        IS_DEV: JSON.stringify(watch)
    }
};

await Promise.all(
    [
        esbuild.build({
            ...commonOptions,
            outfile: "dist/browser.js",
            footer: { js: "//# sourceURL=VencordWeb" },
        }),
        esbuild.build({
            ...commonOptions,
            outfile: "dist/Vencord.user.js",
            banner: {
                js: readFileSync("browser/userscript.meta.js", "utf-8").replace("%version%", PackageJSON.version)
            },
            footer: {
                // UserScripts get wrapped in an iife, so define Vencord prop on window that returns our local
                js: "Object.defineProperty(window,'Vencord',{get:()=>Vencord});"
            },
        })
    ]
);

mkdirSync("dist/extension-unpacked", { recursive: true });
const files = ["modifyResponseHeaders.json", "background.js", "content.js", "manifest.json"];

await Promise.all([
    ...files.map(f => copyFile(join("browser", f), join("dist", "extension-unpacked", f))),
    copyFile("dist/Vencord.js", "dist/extension-unpacked/dist/Vencord.js")
]);

console.info("Extension built to dist/extension-unpacked");

if (process.argv.includes("--zip")) {
    zip({
        dist: {
            "Vencord.js": readFileSync("dist/extension-unpacked/browser.js")
        },
        ...Object.fromEntries(await Promise.all(files.map(async f => [
            f,
            await readFile(join("browser", f))
        ]))),
    }, {}, (err, data) => {
        if (err) {
            console.error(err);
            process.exitCode = 1;
        } else {
            writeFileSync("dist/extension-unsigned.zip", data);
            console.info("Extension written to dist/extension-unsigned.zip");
        }
    });
}

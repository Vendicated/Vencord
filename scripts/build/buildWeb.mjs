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
import { readFileSync } from "fs";
import { appendFile, mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";

// wtf is this assert syntax
import PackageJSON from "../../package.json" assert { type: "json" };
import { commonOpts, globPlugins, watch } from "./common.mjs";

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
        globPlugins("web"),
        ...commonOpts.plugins,
    ],
    target: ["esnext"],
    define: {
        IS_WEB: "true",
        IS_STANDALONE: "true",
        IS_DEV: JSON.stringify(watch),
        IS_DISCORD_DESKTOP: "false",
        IS_VENCORD_DESKTOP: "false"
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
            inject: ["browser/GMPolyfill.js", ...(commonOptions?.inject || [])],
            define: {
                "window": "unsafeWindow",
                ...(commonOptions?.define)
            },
            outfile: "dist/Vencord.user.js",
            banner: {
                js: readFileSync("browser/userscript.meta.js", "utf-8").replace("%version%", `${PackageJSON.version}.${new Date().getTime()}`)
            },
            footer: {
                // UserScripts get wrapped in an iife, so define Vencord prop on window that returns our local
                js: "Object.defineProperty(unsafeWindow,'Vencord',{get:()=>Vencord});"
            },
        })
    ]
);

/**
  * @type {(target: string, files: string[], shouldZip: boolean) => Promise<void>}
 */
async function buildPluginZip(target, files, shouldZip) {
    const entries = {
        "dist/Vencord.js": await readFile("dist/browser.js"),
        "dist/Vencord.css": await readFile("dist/browser.css"),
        ...Object.fromEntries(await Promise.all(files.map(async f => {
            let content = await readFile(join("browser", f));
            if (f.startsWith("manifest")) {
                const json = JSON.parse(content.toString("utf-8"));
                json.version = PackageJSON.version;
                content = new TextEncoder().encode(JSON.stringify(json));
            }

            return [
                f.startsWith("manifest") ? "manifest.json" : f,
                content
            ];
        }))),
    };

    if (shouldZip) {
        return new Promise((resolve, reject) => {
            zip(entries, {}, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    const out = join("dist", target);
                    writeFile(out, data).then(() => {
                        console.info("Extension written to " + out);
                        resolve();
                    }).catch(reject);
                }
            });
        });
    } else {
        await rm(target, { recursive: true, force: true });
        await Promise.all(Object.entries(entries).map(async ([file, content]) => {
            const dest = join("dist", target, file);
            const parentDirectory = join(dest, "..");
            await mkdir(parentDirectory, { recursive: true });
            await writeFile(dest, content);
        }));

        console.info("Unpacked Extension written to dist/" + target);
    }
}

const appendCssRuntime = readFile("dist/Vencord.user.css", "utf-8").then(content => {
    const cssRuntime = `
;document.addEventListener("DOMContentLoaded", () => document.documentElement.appendChild(
    Object.assign(document.createElement("style"), {
        textContent: \`${content.replaceAll("`", "\\`")}\`,
        id: "vencord-css-core"
    })
), { once: true });
`;

    return appendFile("dist/Vencord.user.js", cssRuntime);
});

await Promise.all([
    appendCssRuntime,
    buildPluginZip("extension.zip", ["modifyResponseHeaders.json", "content.js", "manifest.json", "icon.png"], true),
    buildPluginZip("extension-unpacked", ["modifyResponseHeaders.json", "content.js", "manifest.json", "icon.png"], false),
]);


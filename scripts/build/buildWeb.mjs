#!/usr/bin/node
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */


import esbuild from "esbuild";
import { zip } from "fflate";
import { readFileSync } from "fs";
import { appendFile, mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";

import { commonOpts, globPlugins, VERSION, watch } from "./common.mjs";

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
        IS_VENCORD_DESKTOP: "false",
        VERSION: JSON.stringify(VERSION),
        BUILD_TIMESTAMP: Date.now(),
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
                js: readFileSync("browser/userscript.meta.js", "utf-8").replace("%version%", `${VERSION}.${new Date().getTime()}`)
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
                json.version = VERSION;
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
    buildPluginZip("chromium-unpacked", ["modifyResponseHeaders.json", "content.js", "manifest.json", "icon.png"], false),
    buildPluginZip("firefox-unpacked", ["background.js", "content.js", "manifestv2.json", "icon.png"], false),
]);


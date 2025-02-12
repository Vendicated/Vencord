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

// @ts-check

import { readFileSync } from "fs";
import { appendFile, mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import Zip from "zip-local";

import { BUILD_TIMESTAMP, commonOpts, globPlugins, IS_DEV, IS_REPORTER, VERSION, commonRendererPlugins, buildOrWatchAll, stringifyValues } from "./common.mjs";

/**
 * @type {import("esbuild").BuildOptions}
 */
const commonOptions = {
    ...commonOpts,
    entryPoints: ["browser/Vencord.ts"],
    format: "iife",
    globalName: "Vencord",
    external: ["~plugins", "~git-hash", "/assets/*"],
    target: ["esnext"],
    plugins: [
        globPlugins("web"),
        ...commonRendererPlugins
    ],
    define: stringifyValues({
        IS_WEB: true,
        IS_EXTENSION: false,
        IS_STANDALONE: true,
        IS_DEV,
        IS_REPORTER,
        IS_DISCORD_DESKTOP: false,
        IS_VESKTOP: false,
        IS_UPDATER_DISABLED: true,
        VERSION,
        BUILD_TIMESTAMP
    })
};

const MonacoWorkerEntryPoints = [
    "vs/language/css/css.worker.js",
    "vs/editor/editor.worker.js"
];

/** @type {import("esbuild").BuildOptions[]} */
const buildConfigs = [
    {
        entryPoints: MonacoWorkerEntryPoints.map(entry => `node_modules/monaco-editor/esm/${entry}`),
        bundle: true,
        minify: true,
        format: "iife",
        outbase: "node_modules/monaco-editor/esm/",
        outdir: "dist/vendor/monaco"
    },
    {
        entryPoints: ["browser/monaco.ts"],
        bundle: true,
        minify: true,
        format: "iife",
        outfile: "dist/vendor/monaco/index.js",
        loader: {
            ".ttf": "file"
        }
    },
    {
        ...commonOptions,
        outfile: "dist/browser.js",
        footer: { js: "//# sourceURL=VencordWeb" }
    },
    {
        ...commonOptions,
        outfile: "dist/extension.js",
        define: {
            ...commonOptions.define,
            IS_EXTENSION: "true"
        },
        footer: { js: "//# sourceURL=VencordWeb" }
    },
    {
        ...commonOptions,
        inject: ["browser/GMPolyfill.js", ...(commonOptions?.inject || [])],
        define: {
            ...commonOptions.define,
            window: "unsafeWindow",
        },
        outfile: "dist/Vencord.user.js",
        banner: {
            js: readFileSync("browser/userscript.meta.js", "utf-8").replace("%version%", `${VERSION}.${new Date().getTime()}`)
        },
        footer: {
            // UserScripts get wrapped in an iife, so define Vencord prop on window that returns our local
            js: "Object.defineProperty(unsafeWindow,'Vencord',{get:()=>Vencord});"
        }
    }
];

await buildOrWatchAll(buildConfigs);

/**
 * @type {(dir: string) => Promise<string[]>}
 */
async function globDir(dir) {
    const files = [];

    for (const child of await readdir(dir, { withFileTypes: true })) {
        const p = join(dir, child.name);
        if (child.isDirectory())
            files.push(...await globDir(p));
        else
            files.push(p);
    }

    return files;
}

/**
 * @type {(dir: string, basePath?: string) => Promise<Record<string, string>>}
 */
async function loadDir(dir, basePath = "") {
    const files = await globDir(dir);
    return Object.fromEntries(await Promise.all(files.map(async f => [f.slice(basePath.length), await readFile(f)])));
}

/**
  * @type {(target: string, files: string[]) => Promise<void>}
 */
async function buildExtension(target, files) {
    const entries = {
        "dist/Vencord.js": await readFile("dist/extension.js"),
        "dist/Vencord.css": await readFile("dist/extension.css"),
        ...await loadDir("dist/vendor/monaco", "dist/"),
        ...Object.fromEntries(await Promise.all(files.map(async f => {
            let content = await readFile(join("browser", f));
            if (f.startsWith("manifest")) {
                const json = JSON.parse(content.toString("utf-8"));
                json.version = VERSION;
                content = Buffer.from(new TextEncoder().encode(JSON.stringify(json)));
            }

            return [
                f.startsWith("manifest") ? "manifest.json" : f,
                content
            ];
        })))
    };

    await rm(target, { recursive: true, force: true });
    await Promise.all(Object.entries(entries).map(async ([file, content]) => {
        const dest = join("dist", target, file);
        const parentDirectory = join(dest, "..");
        await mkdir(parentDirectory, { recursive: true });
        await writeFile(dest, content);
    }));

    console.info("Unpacked Extension written to dist/" + target);
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

if (!process.argv.includes("--skip-extension")) {
    await Promise.all([
        appendCssRuntime,
        buildExtension("chromium-unpacked", ["modifyResponseHeaders.json", "content.js", "manifest.json", "icon.png"]),
        buildExtension("firefox-unpacked", ["background.js", "content.js", "manifestv2.json", "icon.png"]),
    ]);

    Zip.sync.zip("dist/chromium-unpacked").compress().save("dist/extension-chrome.zip");
    console.info("Packed Chromium Extension written to dist/extension-chrome.zip");

    Zip.sync.zip("dist/firefox-unpacked").compress().save("dist/extension-firefox.zip");
    console.info("Packed Firefox Extension written to dist/extension-firefox.zip");
} else {
    await appendCssRuntime;
}

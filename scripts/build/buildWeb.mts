#!/usr/bin/env tsx
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
import { readFileSync } from "fs";
import { appendFile, mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import Zip from "zip-local";

import { BUILD_TIMESTAMP, buildOpts, globPlugins, IS_DEV, IS_REPORTER, makeBuildPromise, makeContextPromise, VERSION, watch, watchOpts } from "./common.mjs";

const webBuildOpts: esbuild.BuildOptions = {
    ...buildOpts,
    entryPoints: ["browser/Vencord.ts"],
    globalName: "Vencord",
    format: "iife",
    external: ["~plugins", "~git-hash", "/assets/*"],
    plugins: [
        globPlugins("web"),
        ...(buildOpts.plugins ?? []),
    ],
    target: ["esnext"],
    define: {
        IS_WEB: JSON.stringify(true),
        IS_EXTENSION: JSON.stringify(false),
        IS_STANDALONE: JSON.stringify(true),
        IS_DEV: JSON.stringify(IS_DEV),
        IS_REPORTER: JSON.stringify(IS_REPORTER),
        IS_DISCORD_DESKTOP: JSON.stringify(false),
        IS_VESKTOP: JSON.stringify(false),
        IS_UPDATER_DISABLED: JSON.stringify(true),
        VERSION: JSON.stringify(VERSION),
        BUILD_TIMESTAMP: JSON.stringify(BUILD_TIMESTAMP),
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

const buildOptions: esbuild.BuildOptions[] = [
    {
        entryPoints: MonacoWorkerEntryPoints.map(entry => `node_modules/monaco-editor/esm/${entry}`),
        bundle: true,
        minify: true,
        format: "iife",
        outbase: "node_modules/monaco-editor/esm/",
        outdir: "dist/monaco"
    },
    {
        entryPoints: ["browser/monaco.ts"],
        bundle: true,
        minify: true,
        format: "iife",
        outfile: "dist/monaco/index.js",
        loader: {
            ".ttf": "file"
        }
    },
    {
        ...webBuildOpts,
        outfile: "dist/browser.js",
        footer: { js: "//# sourceURL=VencordWeb" }
    },
    {
        ...webBuildOpts,
        outfile: "dist/extension.js",
        define: {
            ...webBuildOpts?.define,
            IS_EXTENSION: JSON.stringify(true),
        },
        footer: { js: "//# sourceURL=VencordWeb" }
    },
    {
        ...webBuildOpts,
        inject: ["browser/GMPolyfill.js", ...(webBuildOpts?.inject || [])],
        define: {
            ...(webBuildOpts?.define),
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

const contextPromises = buildOptions.map(makeContextPromise);
await Promise.all(contextPromises.map(async (contextPromise, buildIndex) => {
    return makeBuildPromise(await contextPromise, buildOptions[buildIndex], watchOpts);
}));

await Promise.all(contextPromises.map(async contextPromise => {
    const context = await contextPromise;
    try {
        if (watch) await context.watch(watchOpts);
    } catch (error) {
        context.dispose();
        throw error;
    }
}));

if (!watch) {
    await Promise.all(contextPromises.map(async contextPromise => {
        return (await contextPromise).dispose();
    }));
}

async function globDir(dir: string): Promise<string[]> {
    const files = [] as string[];

    for (const child of await readdir(dir, { withFileTypes: true })) {
        const p = join(dir, child.name);
        if (child.isDirectory())
            files.push(...await globDir(p));
        else
            files.push(p);
    }

    return files;
}

async function loadDir(dir: string, basePath: string = ""): Promise<Record<string, string>> {
    const files = await globDir(dir);
    const dirContentEntries = await Promise.all(files.map(async (f): Promise<[string, string]> => [f.slice(basePath.length), await readFile(f, { encoding: "utf-8" })]));
    return Object.fromEntries(dirContentEntries satisfies [string, string][]);
}

async function buildExtension(target: string, files: string[]): Promise<void> {
    const entries: Record<string, Buffer> = {
        "dist/Vencord.js": await readFile("dist/extension.js"),
        "dist/Vencord.css": await readFile("dist/extension.css"),
        ...await loadDir("dist/monaco"),
        ...Object.fromEntries(await Promise.all(RnNoiseFiles.map(async file =>
            [`third-party/rnnoise/${file.replace(/^dist\//, "")}`, await readFile(`node_modules/@sapphi-red/web-noise-suppressor/${file}`)]
        ))),
        ...Object.fromEntries(await Promise.all(files.map(async f => {
            let content = await readFile(join("browser", f));
            if (f.startsWith("manifest")) {
                const json = JSON.parse(content.toString("utf-8"));
                json.version = VERSION;
                content = Buffer.from(JSON.stringify(json), "utf-8");
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

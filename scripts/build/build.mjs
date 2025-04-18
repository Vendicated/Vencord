#!/usr/bin/node
/*
 * Tallycord, a modification for Discord's desktop app
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

import { readdir } from "fs/promises";
import { join } from "path";

import {
    BUILD_TIMESTAMP,
    commonOpts,
    exists,
    globPlugins,
    IS_DEV,
    IS_REPORTER,
    IS_STANDALONE,
    IS_UPDATER_DISABLED,
    resolvePluginName,
    VERSION,
    commonRendererPlugins,
    watch,
    buildOrWatchAll,
    stringifyValues,
} from "./common.mjs";

const defines = stringifyValues({
    IS_STANDALONE,
    IS_DEV,
    IS_REPORTER,
    IS_UPDATER_DISABLED,
    IS_WEB: false,
    IS_EXTENSION: false,
    VERSION,
    BUILD_TIMESTAMP,
});

if (defines.IS_STANDALONE === "false") {
    // If this is a local build (not standalone), optimize
    // for the specific platform we're on
    defines["process.platform"] = JSON.stringify(process.platform);
}

/**
 * @type {import("esbuild").BuildOptions}
 */
const nodeCommonOpts = {
    ...commonOpts,
    define: defines,
    format: "cjs",
    platform: "node",
    target: ["esnext"],
    // @ts-ignore this is never undefined
    external: [
        "electron",
        "original-fs",
        "~pluginNatives",
        ...commonOpts.external,
    ],
};

const sourceMapFooter = (s) =>
    watch ? "" : `//# sourceMappingURL=tallycord://${s}.js.map`;
const sourcemap = watch ? "inline" : "external";

/**
 * @type {import("esbuild").Plugin}
 */
const globNativesPlugin = {
    name: "glob-natives-plugin",
    setup: (build) => {
        const filter = /^~pluginNatives$/;
        build.onResolve({ filter }, (args) => {
            return {
                namespace: "import-natives",
                path: args.path,
            };
        });

        build.onLoad({ filter, namespace: "import-natives" }, async () => {
            const pluginDirs = ["plugins", "userplugins"];
            let code = "";
            let natives = "\n";
            let i = 0;
            for (const dir of pluginDirs) {
                const dirPath = join("src", dir);
                if (!(await exists(dirPath))) continue;
                const plugins = await readdir(dirPath, { withFileTypes: true });
                for (const file of plugins) {
                    const fileName = file.name;
                    const nativePath = join(dirPath, fileName, "native.ts");
                    const indexNativePath = join(
                        dirPath,
                        fileName,
                        "native/index.ts"
                    );

                    if (
                        !(await exists(nativePath)) &&
                        !(await exists(indexNativePath))
                    )
                        continue;

                    const pluginName = await resolvePluginName(dirPath, file);

                    const mod = `p${i}`;
                    code += `import * as ${mod} from "./${dir}/${fileName}/native";\n`;
                    natives += `${JSON.stringify(pluginName)}:${mod},\n`;
                    i++;
                }
            }
            code += `export default {${natives}};`;
            return {
                contents: code,
                resolveDir: "./src",
            };
        });
    },
};

/** @type {import("esbuild").BuildOptions[]} */
const buildConfigs = [
    // Discord Desktop main & renderer & preload
    {
        ...nodeCommonOpts,
        entryPoints: ["src/main/index.ts"],
        outfile: "dist/patcher.js",
        footer: {
            js: "//# sourceURL=TallycordPatcher\n" + sourceMapFooter("patcher"),
        },
        sourcemap,
        plugins: [
            // @ts-ignore this is never undefined
            ...nodeCommonOpts.plugins,
            globNativesPlugin,
        ],
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: "true",
            IS_VESKTOP: "false",
        },
    },
    {
        ...commonOpts,
        entryPoints: ["src/Tallycord.ts"],
        outfile: "dist/renderer.js",
        format: "iife",
        target: ["esnext"],
        footer: {
            js:
                "//# sourceURL=TallycordRenderer\n" +
                sourceMapFooter("renderer"),
        },
        globalName: "Tallycord",
        sourcemap,
        plugins: [globPlugins("discordDesktop"), ...commonRendererPlugins],
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: "true",
            IS_VESKTOP: "false",
        },
    },
    {
        ...nodeCommonOpts,
        entryPoints: ["src/preload.ts"],
        outfile: "dist/preload.js",
        footer: {
            js: "//# sourceURL=TallycordPreload\n" + sourceMapFooter("preload"),
        },
        sourcemap,
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: "true",
            IS_VESKTOP: "false",
        },
    },

    // Tallycord Desktop main & renderer & preload
    {
        ...nodeCommonOpts,
        entryPoints: ["src/main/index.ts"],
        outfile: "dist/tallycordDesktopMain.js",
        footer: {
            js:
                "//# sourceURL=TallycordDesktopMain\n" +
                sourceMapFooter("tallycordDesktopMain"),
        },
        sourcemap,
        plugins: [...nodeCommonOpts.plugins, globNativesPlugin],
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: "false",
            IS_VESKTOP: "true",
        },
    },
    {
        ...commonOpts,
        entryPoints: ["src/Tallycord.ts"],
        outfile: "dist/tallycordDesktopRenderer.js",
        format: "iife",
        target: ["esnext"],
        footer: {
            js:
                "//# sourceURL=TallycordDesktopRenderer\n" +
                sourceMapFooter("tallycordDesktopRenderer"),
        },
        globalName: "Tallycord",
        sourcemap,
        plugins: [globPlugins("tallytop"), ...commonRendererPlugins],
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: "false",
            IS_VESKTOP: "true",
        },
    },
    {
        ...nodeCommonOpts,
        entryPoints: ["src/preload.ts"],
        outfile: "dist/tallycordDesktopPreload.js",
        footer: {
            js:
                "//# sourceURL=TallycordPreload\n" +
                sourceMapFooter("tallycordDesktopPreload"),
        },
        sourcemap,
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: "false",
            IS_VESKTOP: "true",
        },
    },
];

await buildOrWatchAll(buildConfigs);

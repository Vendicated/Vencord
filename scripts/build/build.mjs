#!/usr/bin/node
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import esbuild from "esbuild";

import {
    BUILD_TIMESTAMP,
    commonOpts,
    globIpcPlugins,
    globPlugins,
    isStandalone,
    updaterDisabled,
    VERSION,
    watch,
} from "./common.mjs";

const defines = {
    IS_STANDALONE: isStandalone,
    IS_DEV: JSON.stringify(watch),
    IS_UPDATER_DISABLED: updaterDisabled,
    IS_WEB: false,
    IS_EXTENSION: false,
    VERSION: JSON.stringify(VERSION),
    BUILD_TIMESTAMP,
};
if (defines.IS_STANDALONE === "false")
    // If this is a local build (not standalone), optimise
    // for the specific platform we're on
    defines["process.platform"] = JSON.stringify(process.platform);

/**
 * @type {esbuild.BuildOptions}
 */
const nodeCommonOpts = {
    ...commonOpts,
    format: "cjs",
    platform: "node",
    target: ["esnext"],
    external: ["electron", "original-fs", ...commonOpts.external],
    define: defines,
};

const sourceMapFooter = s =>
    watch ? "" : `//# sourceMappingURL=vencord://${s}.js.map`;
const sourcemap = watch ? "inline" : "external";

await Promise.all([
    // Discord Desktop main & renderer & preload
    esbuild.build({
        ...nodeCommonOpts,
        entryPoints: ["src/main/index.ts"],
        outfile: "dist/patcher.js",
        footer: {
            js: "//# sourceURL=VencordPatcher\n" + sourceMapFooter("patcher"),
        },
        sourcemap,
        plugins: [globIpcPlugins, ...commonOpts.plugins],
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: true,
            IS_VESKTOP: false,
        },
    }),
    esbuild.build({
        ...commonOpts,
        entryPoints: ["src/Vencord.ts"],
        outfile: "dist/renderer.js",
        format: "iife",
        target: ["esnext"],
        footer: {
            js: "//# sourceURL=VencordRenderer\n" + sourceMapFooter("renderer"),
        },
        globalName: "Vencord",
        sourcemap,
        plugins: [
            globPlugins("discordDesktop"),
            globIpcPlugins,
            ...commonOpts.plugins,
        ],
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: true,
            IS_VESKTOP: false,
        },
    }),
    esbuild.build({
        ...nodeCommonOpts,
        entryPoints: ["src/preload.ts"],
        outfile: "dist/preload.js",
        footer: {
            js: "//# sourceURL=VencordPreload\n" + sourceMapFooter("preload"),
        },
        sourcemap,
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: true,
            IS_VESKTOP: false,
        },
    }),

    // Vencord Desktop main & renderer & preload
    esbuild.build({
        ...nodeCommonOpts,
        entryPoints: ["src/main/index.ts"],
        outfile: "dist/vencordDesktopMain.js",
        footer: {
            js:
                "//# sourceURL=VencordDesktopMain\n" +
                sourceMapFooter("vencordDesktopMain"),
        },
        sourcemap,
        plugins: [globIpcPlugins, ...commonOpts.plugins],
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: false,
            IS_VESKTOP: true,
        },
    }),
    esbuild.build({
        ...commonOpts,
        entryPoints: ["src/Vencord.ts"],
        outfile: "dist/vencordDesktopRenderer.js",
        format: "iife",
        target: ["esnext"],
        footer: {
            js:
                "//# sourceURL=VencordDesktopRenderer\n" +
                sourceMapFooter("vencordDesktopRenderer"),
        },
        globalName: "Vencord",
        sourcemap,
        plugins: [
            globPlugins("vencordDesktop"),
            globIpcPlugins,
            ...commonOpts.plugins,
        ],
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: false,
            IS_VESKTOP: true,
        },
    }),
    esbuild.build({
        ...nodeCommonOpts,
        entryPoints: ["src/preload.ts"],
        outfile: "dist/vencordDesktopPreload.js",
        footer: {
            js:
                "//# sourceURL=VencordPreload\n" +
                sourceMapFooter("vencordDesktopPreload"),
        },
        sourcemap,
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: false,
            IS_VESKTOP: true,
        },
    }),
    esbuild.build({
        ...commonOpts,
        entryPoints: ["src/main/ipcPlugins/renderer.ts"],
        outfile: "dist/ipcPlugins.js",
        format: "iife",
        target: ["esnext"],
        footer: {
            js:
                "//# sourceURL=VencordIpcPlugins\n" +
                sourceMapFooter("ipcPlugins"),
        },
        globalName: "VencordIpc",
        sourcemap,
        plugins: [
            globPlugins("discordDesktop"),
            globIpcPlugins,
            ...commonOpts.plugins,
        ],
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: true,
            IS_VESKTOP: false,
        },
    }),
    esbuild.build({
        ...commonOpts,
        entryPoints: ["src/main/ipcPlugins/renderer.ts"],
        outfile: "dist/vencordDesktopIpcPlugins.js",
        format: "iife",
        target: ["esnext"],
        footer: {
            js:
                "//# sourceURL=VencordIpcPlugins\n" +
                sourceMapFooter("vencordDesktopIpcPlugins"),
        },
        globalName: "VencordIpc",
        sourcemap,
        plugins: [
            globPlugins("vencordDesktop"),
            globIpcPlugins,
            ...commonOpts.plugins,
        ],
        define: {
            ...defines,
            IS_DISCORD_DESKTOP: false,
            IS_VESKTOP: true,
        },
    }),
]).catch(err => {
    console.error("Build failed");
    console.error(err.message);
    // make ci fail
    if (!commonOpts.watch) process.exitCode = 1;
});

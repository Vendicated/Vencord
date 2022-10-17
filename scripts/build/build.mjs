#!/usr/bin/node
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
    plugins: process.argv[2] === "nix" ? [] : [makeAllPackagesExternalPlugin],
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

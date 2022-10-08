#!/usr/bin/node
import esbuild from "esbuild";
import { gitHashPlugin, globPlugins } from "./buildCommon.mjs";
import { sassPlugin } from "esbuild-sass-plugin";

/** @type {esbuild.WatchMode|false} */
const watch = process.argv.includes("--watch");

/**
 * Ref: https://github.com/evanw/esbuild/issues/619#issuecomment-751995294
 * @type {esbuild.Plugin}
 */
const makeAllPackagesExternalPlugin = {
    name: "make-all-packages-external",
    setup(build) {
        let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/; // Must not start with "/" or "./" or "../"
        build.onResolve({ filter }, args => ({ path: args.path, external: true }));
    }
};

await Promise.all([
    esbuild.build({
        logLevel: "info",
        entryPoints: ["src/preload.ts"],
        outfile: "dist/preload.js",
        format: "cjs",
        bundle: true,
        platform: "node",
        target: ["esnext"],
        sourcemap: false,
        plugins: [makeAllPackagesExternalPlugin],
        watch
    }),
    esbuild.build({
        logLevel: "info",
        entryPoints: ["src/patcher.ts"],
        outfile: "dist/patcher.js",
        bundle: true,
        format: "cjs",
        target: ["esnext"],
        external: ["electron"],
        platform: "node",
        sourcemap: false,
        plugins: [makeAllPackagesExternalPlugin],
        watch
    }),
    esbuild.build({
        logLevel: "info",
        entryPoints: ["src/Vencord.ts"],
        outfile: "dist/renderer.js",
        format: "iife",
        bundle: true,
        target: ["esnext"],
        footer: { js: "//# sourceURL=VencordRenderer" },
        globalName: "Vencord",
        external: ["plugins", "git-hash"],
        plugins: [
            globPlugins,
            gitHashPlugin,
            sassPlugin({ type: "css-text" })
        ],
        sourcemap: false,
        watch,
        minify: true
    })
]).catch(err => {
    console.error("Build failed");
    console.error(err.message);
});

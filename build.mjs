#!/usr/bin/node
import { execSync } from "child_process";
import esbuild from "esbuild";
import { readdirSync } from "fs";

/**
 * @type {esbuild.WatchMode|false}
 */
const watch = process.argv.includes("--watch");

// https://github.com/evanw/esbuild/issues/619#issuecomment-751995294
/**
 * @type {esbuild.Plugin}
 */
const makeAllPackagesExternalPlugin = {
    name: "make-all-packages-external",
    setup(build) {
        let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/; // Must not start with "/" or "./" or "../"
        build.onResolve({ filter }, args => ({ path: args.path, external: true }));
    },
};

/**
 * @type {esbuild.Plugin}
 */
const globPlugins = {
    name: "glob-plugins",
    setup: build => {
        build.onResolve({ filter: /^plugins$/ }, args => {
            return {
                namespace: "import-plugins",
                path: args.path
            };
        });

        build.onLoad({ filter: /^plugins$/, namespace: "import-plugins" }, () => {
            const files = readdirSync("./src/plugins");
            let code = "";
            let obj = "";
            for (let i = 0; i < files.length; i++) {
                if (files[i] === "index.ts") {
                    continue;
                }
                const mod = `__pluginMod${i}`;
                code += `import ${mod} from "./${files[i].replace(/.tsx?$/, "")}";\n`;
                obj += `[${mod}.name]: ${mod},`;
            }
            code += `export default {${obj}}`;
            return {
                contents: code,
                resolveDir: "./src/plugins"
            };
        });
    }
};

const gitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
/**
 * @type {esbuild.Plugin}
 */
const gitHashPlugin = {
    name: "git-hash-plugin",
    setup: build => {
        const filter = /^git-hash$/;
        build.onResolve({ filter }, args => ({
            namespace: "git-hash", path: args.path
        }));
        build.onLoad({ filter, namespace: "git-hash" }, () => ({
            contents: `export default "${gitHash}"`
        }));
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
        sourcemap: "linked",
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
        sourcemap: "linked",
        plugins: [makeAllPackagesExternalPlugin],
        watch
    }),
    esbuild.build({
        logLevel: "info",
        entryPoints: ["src/Bencord.ts"],
        outfile: "dist/renderer.js",
        format: "iife",
        bundle: true,
        target: ["esnext"],
        footer: { js: "//# sourceURL=BencordRenderer" },
        globalName: "Bencord",
        external: ["plugins", "git-hash"],
        plugins: [
            globPlugins,
            gitHashPlugin
        ],
        sourcemap: false,
        watch,
        minify: true,
    }),
]).catch(err => {
    console.error("Build failed");
    console.error(err.message);
    // make ci fail
    if (!watch)
        process.exitCode = 1;
});

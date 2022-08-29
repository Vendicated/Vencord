#!/usr/bin/node
import esbuild from "esbuild";
import { readdirSync } from "fs";
import { performance } from "perf_hooks";

/**
 * @type {esbuild.WatchMode|false}
 */
const watch = process.argv.includes("--watch") ? {
    onRebuild: (err) => {
        if (err) console.error("Build Error", err.message);
        else console.log("Rebuilt!");
    }
} : false;

// https://github.com/evanw/esbuild/issues/619#issuecomment-751995294
/**
 * @type {esbuild.Plugin}
 */
const makeAllPackagesExternalPlugin = {
    name: 'make-all-packages-external',
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
            let arr = "[";
            for (let i = 0; i < files.length; i++) {
                if (files[i] === "index.ts") {
                    continue;
                }
                const mod = `__pluginMod${i}`;
                code += `import ${mod} from "./${files[i].replace(".ts", "")}";\n`;
                arr += `${mod},`;
            }
            code += `export default ${arr}]`;
            return {
                contents: code,
                resolveDir: "./src/plugins"
            };
        });
    }
};

const begin = performance.now();
await Promise.all([
    esbuild.build({
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
        entryPoints: ["src/Vencord.ts"],
        outfile: "dist/renderer.js",
        format: "iife",
        bundle: true,
        target: ["esnext"],
        footer: { js: "//# sourceURL=VencordRenderer" },
        globalName: "Vencord",
        external: ["plugins"],
        plugins: [
            globPlugins
        ],
        sourcemap: "inline",
        watch,
        minify: true
    })
]).then(res => {
    const took = performance.now() - begin;
    console.log(`Built in ${took.toFixed(2)}ms`);
}).catch(err => {
    console.error("Build failed");
    console.error(err.message);
});

if (watch) console.log("Watching...");
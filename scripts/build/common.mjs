import { execSync } from "child_process";
import esbuild from "esbuild";
import { readdir } from "fs/promises";

const watch = process.argv.includes("--watch");

/**
 * @type {esbuild.BuildOptions}
 */
export const commonOpts = {
    logLevel: "info",
    bundle: true,
    watch,
    minify: !watch,
    sourcemap: watch ? "inline" : ""
};

// https://github.com/evanw/esbuild/issues/619#issuecomment-751995294
/**
 * @type {esbuild.Plugin}
 */
export const makeAllPackagesExternalPlugin = {
    name: "make-all-packages-external",
    setup(build) {
        let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/; // Must not start with "/" or "./" or "../"
        build.onResolve({ filter }, args => ({ path: args.path, external: true }));
    },
};

/**
 * @type {esbuild.Plugin}
 */
export const globPlugins = {
    name: "glob-plugins",
    setup: build => {
        build.onResolve({ filter: /^plugins$/ }, args => {
            return {
                namespace: "import-plugins",
                path: args.path
            };
        });

        build.onLoad({ filter: /^plugins$/, namespace: "import-plugins" }, async () => {
            const files = await readdir("./src/plugins");
            let code = "";
            let plugins = "\n";
            for (let i = 0; i < files.length; i++) {
                if (files[i] === "index.ts") {
                    continue;
                }
                const mod = `p${i}`;
                code += `import ${mod} from "./${files[i].replace(/.tsx?$/, "")}";\n`;
                plugins += `[${mod}.name]:${mod},\n`;
            }
            code += `export default {${plugins}};`;
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
export const gitHashPlugin = {
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

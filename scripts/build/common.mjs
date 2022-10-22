import { execSync } from "child_process";
import esbuild from "esbuild";
import { existsSync, statSync } from "fs";
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
    sourcemap: watch ? "inline" : "",
    legalComments: "linked",
};

// https://github.com/evanw/esbuild/issues/619#issuecomment-751995294
/**
 * @type {esbuild.Plugin}
 */
export const makeAllPackagesExternalPlugin = {
    name: "make-all-packages-external",
    setup(build) {
        const filter = /^[^./]|^\.[^./]|^\.\.[^/]/; // Must not start with "/" or "./" or "../"
        build.onResolve({ filter }, (args) => ({
            path: args.path,
            external: true,
        }));
    },
};

/**
 * @type {esbuild.Plugin}
 */
export const globPlugins = {
    name: "glob-plugins",
    setup: (build) => {
        build.onResolve({ filter: /^plugins$/ }, (args) => {
            return {
                namespace: "import-plugins",
                path: args.path,
            };
        });

        build.onLoad(
            { filter: /^plugins$/, namespace: "import-plugins" },
            async () => {
                const pluginDirs = ["plugins", "userplugins"];
                let code = "";
                let plugins = "\n";
                let i = 0;
                for (const dir of pluginDirs) {
                    if (!existsSync(`./src/${dir}`)) continue;
                    const files = await readdir(`./src/${dir}`);
                    for (const file of files) {
                        let isNew = false;
                        let stats = statSync(`./src/${dir}/${file}`);
                        if (
                            new Date(stats.birthtime.valueOf()).setDate(
                                stats.birthtime.getDate() + 7
                            ) > Date.now()
                        ) {
                            // IF FILE IS NEW
                            console.log(`./src/${dir}/${file} `);
                            isNew = true;
                        }
                        if (file === "index.ts") {
                            continue;
                        }
                        const mod = `p${i}`;
                        code += `import ${mod} from "./${dir}/${file.replace(
                            /.tsx?$/,
                            ""
                        )}";\n`;
                        code += `${mod}.new = ${isNew};\n`;
                        plugins += `[${mod}.name]:${mod},\n`;
                        i++;
                    }
                }
                code += `export default {${plugins}};`;
                return {
                    contents: code,
                    resolveDir: "./src",
                };
            }
        );
    },
};

const gitHash = execSync("git rev-parse --short HEAD", {
    encoding: "utf-8",
}).trim();
/**
 * @type {esbuild.Plugin}
 */
export const gitHashPlugin = {
    name: "git-hash-plugin",
    setup: (build) => {
        const filter = /^git-hash$/;
        build.onResolve({ filter }, (args) => ({
            namespace: "git-hash",
            path: args.path,
        }));
        build.onLoad({ filter, namespace: "git-hash" }, () => ({
            contents: `export default "${gitHash}"`,
        }));
    },
};

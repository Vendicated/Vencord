import { readdirSync } from "fs";
import { execSync } from "child_process";

const gitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();

/** @type {import("esbuild").Plugin} */
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

/** @type {import("esbuild").Plugin} */
export const globPlugins = {
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

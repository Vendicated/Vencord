// TODO: Modularise the plugins since both build scripts use them

import { execSync } from "child_process";
import { createWriteStream, readdirSync, readFileSync } from "fs";
import yazl from "yazl";
import esbuild from "esbuild";
// wtf is this assert syntax
import PackageJSON from "./package.json" assert { type: "json" };

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

/**
 * @type {esbuild.BuildOptions}
 */
const commonOptions = {
    logLevel: "info",
    entryPoints: ["browser/Vencord.ts"],
    globalName: "Vencord",
    format: "iife",
    bundle: true,
    minify: true,
    sourcemap: false,
    external: ["plugins", "git-hash"],
    plugins: [
        globPlugins,
        gitHashPlugin
    ],
    target: ["esnext"],
};

await Promise.all(
    [
        esbuild.build({
            ...commonOptions,
            outfile: "dist/browser.js",
            footer: { js: "//# sourceURL=VencordWeb" },
        }),
        esbuild.build({
            ...commonOptions,
            outfile: "dist/Vencord.user.js",
            banner: {
                js: readFileSync("browser/userscript.meta.js", "utf-8").replace("%version%", PackageJSON.version)
            },
            footer: {
                // UserScripts get wrapped in an iife, so define Vencord prop on window that returns our local
                js: "Object.defineProperty(window,'Vencord',{get:()=>Vencord});"
            },
        })
    ]
);

const zip = new yazl.ZipFile();
zip.outputStream.pipe(createWriteStream("dist/extension.zip")).on("close", () => {
    console.info("Extension written to dist/extension.zip");
});

zip.addFile("dist/browser.js", "dist/Vencord.js");
["background.js", "content.js", "manifest.json"].forEach(f => {
    zip.addFile(`browser/${f}`, `${f}`);
});
zip.end();

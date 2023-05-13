/*
 * Vencord, a modification for Discord's desktop app
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

import { exec, execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { join, relative } from "path";
import { promisify } from "util";

export const watch = process.argv.includes("--watch");
export const isStandalone = JSON.stringify(process.argv.includes("--standalone"));
export const gitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
export const banner = {
    js: `
// Vencord ${gitHash}
// Standalone: ${isStandalone}
// Platform: ${isStandalone === "false" ? process.platform : "Universal"}
`.trim()
};

const isWeb = process.argv.slice(0, 2).some(f => f.endsWith("buildWeb.mjs"));

// https://github.com/evanw/esbuild/issues/619#issuecomment-751995294
/**
 * @type {import("esbuild").Plugin}
 */
export const makeAllPackagesExternalPlugin = {
    name: "make-all-packages-external",
    setup(build) {
        const filter = /^[^./]|^\.[^./]|^\.\.[^/]/; // Must not start with "/" or "./" or "../"
        build.onResolve({ filter }, args => ({ path: args.path, external: true }));
    },
};

/**
 * @type {(kind: "web" | "discordDesktop" | "vencordDesktop") => import("esbuild").Plugin}
 */
export const globPlugins = kind => ({
    name: "glob-plugins",
    setup: build => {
        const filter = /^~plugins$/;
        build.onResolve({ filter }, args => {
            return {
                namespace: "import-plugins",
                path: args.path
            };
        });

        build.onLoad({ filter, namespace: "import-plugins" }, async () => {
            const pluginDirs = ["plugins", "userplugins"];
            let code = "";
            let plugins = "\n";
            let i = 0;
            for (const dir of pluginDirs) {
                if (!existsSync(`./src/${dir}`)) continue;
                const files = await readdir(`./src/${dir}`);
                for (const file of files) {
                    if (file.startsWith(".")) continue;
                    if (file === "index.ts") continue;
                    const fileBits = file.split(".");
                    if (fileBits.length > 2 && ["ts", "tsx"].includes(fileBits.at(-1))) {
                        const mod = fileBits.at(-2);
                        if (mod === "dev" && !watch) continue;
                        if (mod === "web" && kind === "discordDesktop") continue;
                        if (mod === "desktop" && kind === "web") continue;
                        if (mod === "discordDesktop" && kind !== "discordDesktop") continue;
                        if (mod === "vencordDesktop" && kind !== "vencordDesktop") continue;
                    }

                    const mod = `p${i}`;
                    code += `import ${mod} from "./${dir}/${file.replace(/\.tsx?$/, "")}";\n`;
                    plugins += `[${mod}.name]:${mod},\n`;
                    i++;
                }
            }
            code += `export default {${plugins}};`;
            return {
                contents: code,
                resolveDir: "./src"
            };
        });
    }
});

/**
 * @type {import("esbuild").Plugin}
 */
export const gitHashPlugin = {
    name: "git-hash-plugin",
    setup: build => {
        const filter = /^~git-hash$/;
        build.onResolve({ filter }, args => ({
            namespace: "git-hash", path: args.path
        }));
        build.onLoad({ filter, namespace: "git-hash" }, () => ({
            contents: `export default "${gitHash}"`
        }));
    }
};

/**
 * @type {import("esbuild").Plugin}
 */
export const gitRemotePlugin = {
    name: "git-remote-plugin",
    setup: build => {
        const filter = /^~git-remote$/;
        build.onResolve({ filter }, args => ({
            namespace: "git-remote", path: args.path
        }));
        build.onLoad({ filter, namespace: "git-remote" }, async () => {
            const res = await promisify(exec)("git remote get-url origin", { encoding: "utf-8" });
            const remote = res.stdout.trim()
                .replace("https://github.com/", "")
                .replace("git@github.com:", "")
                .replace(/.git$/, "");

            return { contents: `export default "${remote}"` };
        });
    }
};

/**
 * @type {import("esbuild").Plugin}
 */
export const fileIncludePlugin = {
    name: "file-include-plugin",
    setup: build => {
        const filter = /^~fileContent\/.+$/;
        build.onResolve({ filter }, args => ({
            namespace: "include-file",
            path: args.path,
            pluginData: {
                path: join(args.resolveDir, args.path.slice("include-file/".length))
            }
        }));
        build.onLoad({ filter, namespace: "include-file" }, async ({ pluginData: { path } }) => {
            const [name, format] = path.split(";");
            return {
                contents: `export default ${JSON.stringify(await readFile(name, format ?? "utf-8"))}`
            };
        });
    }
};

const styleModule = readFileSync("./scripts/build/module/style.js", "utf-8");
/**
 * @type {import("esbuild").Plugin}
 */
export const stylePlugin = {
    name: "style-plugin",
    setup: ({ onResolve, onLoad }) => {
        onResolve({ filter: /\.css\?managed$/, namespace: "file" }, ({ path, resolveDir }) => ({
            path: relative(process.cwd(), join(resolveDir, path.replace("?managed", ""))),
            namespace: "managed-style",
        }));
        onLoad({ filter: /\.css$/, namespace: "managed-style" }, async ({ path }) => {
            const css = await readFile(path, "utf-8");
            const name = relative(process.cwd(), path).replaceAll("\\", "/");

            return {
                loader: "js",
                contents: styleModule
                    .replaceAll("STYLE_SOURCE", JSON.stringify(css))
                    .replaceAll("STYLE_NAME", JSON.stringify(name))
            };
        });
    }
};

/**
 * @type {import("esbuild").BuildOptions}
 */
export const commonOpts = {
    logLevel: "info",
    bundle: true,
    watch,
    minify: !watch,
    sourcemap: watch ? "inline" : "",
    legalComments: "linked",
    banner,
    plugins: [fileIncludePlugin, gitHashPlugin, gitRemotePlugin, stylePlugin],
    external: ["~plugins", "~git-hash", "~git-remote", "/assets/*"],
    inject: ["./scripts/build/inject/react.mjs"],
    jsxFactory: "VencordCreateElement",
    jsxFragment: "VencordFragment",
    // Work around https://github.com/evanw/esbuild/issues/2460
    tsconfig: "./scripts/build/tsconfig.esbuild.json"
};

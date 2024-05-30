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

import "../suppressExperimentalWarnings.js";
import "../checkNodeVersion.js";

import { exec, execSync } from "child_process";
import esbuild from "esbuild";
import { constants as FsConstants, readFileSync } from "fs";
import { access, readdir, readFile } from "fs/promises";
import { minify as minifyHtml } from "html-minifier-terser";
import { join, relative } from "path";
import { promisify } from "util";

import { getPluginTarget } from "../utils.mjs";

/** @type {import("../../package.json")} */
const PackageJSON = JSON.parse(readFileSync("package.json"));

export const VERSION = PackageJSON.version;
// https://reproducible-builds.org/docs/source-date-epoch/
export const BUILD_TIMESTAMP = Number(process.env.SOURCE_DATE_EPOCH) || Date.now();
export const watch = process.argv.includes("--watch");
export const isDev = watch || process.argv.includes("--dev");
export const isStandalone = JSON.stringify(process.argv.includes("--standalone"));
export const updaterDisabled = JSON.stringify(process.argv.includes("--disable-updater"));
export const gitHash = process.env.VENCORD_HASH || execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
export const banner = {
    js: `
// Vencord ${gitHash}
// Standalone: ${isStandalone}
// Platform: ${isStandalone === "false" ? process.platform : "Universal"}
// Updater disabled: ${updaterDisabled}
`.trim()
};

const isWeb = process.argv.slice(0, 2).some(f => f.endsWith("buildWeb.mjs"));

export function existsAsync(path) {
    return access(path, FsConstants.F_OK)
        .then(() => true)
        .catch(() => false);
}

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
            const pluginDirs = ["plugins/_api", "plugins/_core", "plugins", "userplugins"];
            let code = "";
            let plugins = "\n";
            let i = 0;
            for (const dir of pluginDirs) {
                if (!await existsAsync(`./src/${dir}`)) continue;
                const files = await readdir(`./src/${dir}`);
                for (const file of files) {
                    if (file.startsWith("_") || file.startsWith(".")) continue;
                    if (file === "index.ts") continue;

                    const target = getPluginTarget(file);
                    if (target) {
                        if (target === "dev" && !watch) continue;
                        if (target === "web" && kind === "discordDesktop") continue;
                        if (target === "desktop" && kind === "web") continue;
                        if (target === "discordDesktop" && kind !== "discordDesktop") continue;
                        if (target === "vencordDesktop" && kind !== "vencordDesktop") continue;
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
            let remote = process.env.VENCORD_REMOTE;
            if (!remote) {
                const res = await promisify(exec)("git remote get-url origin", { encoding: "utf-8" });
                remote = res.stdout.trim()
                    .replace("https://github.com/", "")
                    .replace("git@github.com:", "")
                    .replace(/.git$/, "");
            }

            return { contents: `export default "${remote}"` };
        });
    }
};

/**
 * @type {import("esbuild").Plugin}
 */
export const fileUrlPlugin = {
    name: "file-uri-plugin",
    setup: build => {
        const filter = /^file:\/\/.+$/;
        build.onResolve({ filter }, args => ({
            namespace: "file-uri",
            path: args.path,
            pluginData: {
                uri: args.path,
                path: join(args.resolveDir, args.path.slice("file://".length).split("?")[0])
            }
        }));
        build.onLoad({ filter, namespace: "file-uri" }, async ({ pluginData: { path, uri } }) => {
            const { searchParams } = new URL(uri);
            const base64 = searchParams.has("base64");
            const minify = isStandalone === "true" && searchParams.has("minify");
            const noTrim = searchParams.get("trim") === "false";

            const encoding = base64 ? "base64" : "utf-8";

            let content;
            if (!minify) {
                content = await readFile(path, encoding);
                if (!noTrim) content = content.trimEnd();
            } else {
                if (path.endsWith(".html")) {
                    content = await minifyHtml(await readFile(path, "utf-8"), {
                        collapseWhitespace: true,
                        removeComments: true,
                        minifyCSS: true,
                        minifyJS: true,
                        removeEmptyAttributes: true,
                        removeRedundantAttributes: true,
                        removeScriptTypeAttributes: true,
                        removeStyleLinkTypeAttributes: true,
                        useShortDoctype: true
                    });
                } else if (/[mc]?[jt]sx?$/.test(path)) {
                    const res = await esbuild.build({
                        entryPoints: [path],
                        write: false,
                        minify: true
                    });
                    content = res.outputFiles[0].text;
                } else {
                    throw new Error(`Don't know how to minify file type: ${path}`);
                }

                if (base64)
                    content = Buffer.from(content).toString("base64");
            }

            return {
                contents: `export default ${JSON.stringify(content)}`
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
    plugins: [fileUrlPlugin, gitHashPlugin, gitRemotePlugin, stylePlugin],
    external: ["~plugins", "~git-hash", "~git-remote", "/assets/*"],
    inject: ["./scripts/build/inject/react.mjs"],
    jsxFactory: "VencordCreateElement",
    jsxFragment: "VencordFragment",
    // Work around https://github.com/evanw/esbuild/issues/2460
    tsconfig: "./scripts/build/tsconfig.esbuild.json"
};

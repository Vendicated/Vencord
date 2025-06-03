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

// @ts-check

import "../suppressExperimentalWarnings.js";
import "../checkNodeVersion.js";

import { exec, execSync } from "child_process";
import esbuild, { build, context } from "esbuild";
import { constants as FsConstants, readFileSync } from "fs";
import { access, readdir, readFile } from "fs/promises";
import { minify as minifyHtml } from "html-minifier-terser";
import { join, relative } from "path";
import { promisify } from "util";

import { getPluginTarget } from "../utils.mjs";
import { builtinModules } from "module";

/** @type {import("../../package.json")} */
const PackageJSON = JSON.parse(readFileSync("package.json", "utf-8"));

export const VERSION = PackageJSON.version;
// https://reproducible-builds.org/docs/source-date-epoch/
export const BUILD_TIMESTAMP = Number(process.env.SOURCE_DATE_EPOCH) || Date.now();

export const watch = process.argv.includes("--watch");
export const IS_DEV = watch || process.argv.includes("--dev");
export const IS_REPORTER = process.argv.includes("--reporter");
export const IS_STANDALONE = process.argv.includes("--standalone");

export const IS_UPDATER_DISABLED = process.argv.includes("--disable-updater");
export const gitHash = process.env.VENCORD_HASH || execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();

export const banner = {
    js: `
// Vencord ${gitHash}
// Standalone: ${IS_STANDALONE}
// Platform: ${IS_STANDALONE === false ? process.platform : "Universal"}
// Updater Disabled: ${IS_UPDATER_DISABLED}
`.trim()
};

/**
 * JSON.stringify all values in an object
 * @type {(obj: Record<string, any>) => Record<string, string>}
 */
export function stringifyValues(obj) {
    for (const key in obj) {
        obj[key] = JSON.stringify(obj[key]);
    }
    return obj;
}

/**
 * @param {import("esbuild").BuildOptions[]} buildConfigs
 */
export async function buildOrWatchAll(buildConfigs) {
    if (watch) {
        await Promise.all(buildConfigs.map(cfg =>
            context(cfg).then(ctx => ctx.watch())
        ));
    } else {
        await Promise.all(buildConfigs.map(cfg => build(cfg)))
            .catch(error => {
                console.error(error.message);
                process.exit(1); // exit immediately to skip the rest of the builds
            });
    }
}

const PluginDefinitionNameMatcher = /definePlugin\(\{\s*(["'])?name\1:\s*(["'`])(.+?)\2/;
/**
 * @param {string} base
 * @param {import("fs").Dirent} dirent
 */
export async function resolvePluginName(base, dirent) {
    const fullPath = join(base, dirent.name);
    const content = dirent.isFile()
        ? await readFile(fullPath, "utf-8")
        : await (async () => {
            for (const file of ["index.ts", "index.tsx"]) {
                try {
                    return await readFile(join(fullPath, file), "utf-8");
                } catch {
                    continue;
                }
            }
            throw new Error(`Invalid plugin ${fullPath}: could not resolve entry point`);
        })();

    return PluginDefinitionNameMatcher.exec(content)?.[3]
        ?? (() => {
            throw new Error(`Invalid plugin ${fullPath}: must contain definePlugin call with simple string name property as first property`);
        })();
}

export async function exists(path) {
    return await access(path, FsConstants.F_OK)
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
    }
};

/**
 * @type {(kind: "web" | "discordDesktop" | "vesktop") => import("esbuild").Plugin}
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
            let pluginsCode = "\n";
            let metaCode = "\n";
            let excludedCode = "\n";
            let i = 0;
            for (const dir of pluginDirs) {
                const userPlugin = dir === "userplugins";

                const fullDir = `./src/${dir}`;
                if (!await exists(fullDir)) continue;
                const files = await readdir(fullDir, { withFileTypes: true });
                for (const file of files) {
                    const fileName = file.name;
                    if (fileName.startsWith("_") || fileName.startsWith(".")) continue;
                    if (fileName === "index.ts") continue;

                    const target = getPluginTarget(fileName);

                    if (target && !IS_REPORTER) {
                        const excluded =
                            (target === "dev" && !IS_DEV) ||
                            (target === "web" && kind === "discordDesktop") ||
                            (target === "desktop" && kind === "web") ||
                            (target === "discordDesktop" && kind !== "discordDesktop") ||
                            (target === "vesktop" && kind !== "vesktop");

                        if (excluded) {
                            const name = await resolvePluginName(fullDir, file);
                            excludedCode += `${JSON.stringify(name)}:${JSON.stringify(target)},\n`;
                            continue;
                        }
                    }

                    const folderName = `src/${dir}/${fileName}`.replace(/^src\/plugins\//, "");

                    const mod = `p${i}`;
                    code += `import ${mod} from "./${dir}/${fileName.replace(/\.tsx?$/, "")}";\n`;
                    pluginsCode += `[${mod}.name]:${mod},\n`;
                    metaCode += `[${mod}.name]:${JSON.stringify({ folderName, userPlugin })},\n`;
                    i++;
                }
            }
            code += `export default {${pluginsCode}};export const PluginMeta={${metaCode}};export const ExcludedPlugins={${excludedCode}};`;
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
            const minify = IS_STANDALONE === true && searchParams.has("minify");
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
 * @type {(filter: RegExp, message: string) => import("esbuild").Plugin}
 */
export const banImportPlugin = (filter, message) => ({
    name: "ban-imports",
    setup: build => {
        build.onResolve({ filter }, () => {
            return { errors: [{ text: message }] };
        });
    }
});

/**
 * @type {import("esbuild").BuildOptions}
 */
export const commonOpts = {
    logLevel: "info",
    bundle: true,
    minify: !watch && !IS_REPORTER,
    sourcemap: watch ? "inline" : "external",
    legalComments: "linked",
    banner,
    plugins: [fileUrlPlugin, gitHashPlugin, gitRemotePlugin, stylePlugin],
    external: ["~plugins", "~git-hash", "~git-remote", "/assets/*"],
    inject: ["./scripts/build/inject/react.mjs"],
    jsx: "transform",
    jsxFactory: "VencordCreateElement",
    jsxFragment: "VencordFragment"
};

const escapedBuiltinModules = builtinModules
    .map(m => m.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
    .join("|");
const builtinModuleRegex = new RegExp(`^(node:)?(${escapedBuiltinModules})$`);

export const commonRendererPlugins = [
    banImportPlugin(builtinModuleRegex, "Cannot import node inbuilt modules in browser code. You need to use a native.ts file"),
    banImportPlugin(/^react$/, "Cannot import from react. React and hooks should be imported from @webpack/common"),
    banImportPlugin(/^electron(\/.*)?$/, "Cannot import electron in browser code. You need to use a native.ts file"),
    banImportPlugin(/^ts-pattern$/, "Cannot import from ts-pattern. match and P should be imported from @webpack/common"),
    // @ts-ignore this is never undefined
    ...commonOpts.plugins
];

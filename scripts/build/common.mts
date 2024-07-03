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
import { constants as FsConstants, type Dirent, type PathLike, readFileSync } from "fs";
import { access, readdir, readFile } from "fs/promises";
import { minify as minifyHtml } from "html-minifier-terser";
import { join, relative } from "path";
import { promisify } from "util";

import { getPluginTarget, type PromiseWithResolvers, promiseWithResolvers } from "../utils.mjs";

const PackageJSON: typeof import("../../package.json") = JSON.parse(readFileSync("package.json", { encoding: "utf-8" }));

export const VERSION = PackageJSON.version;
// https://reproducible-builds.org/docs/source-date-epoch/
export const BUILD_TIMESTAMP = Number(process.env.SOURCE_DATE_EPOCH) || Date.now();

export const watch = process.argv.includes("--watch");
export const summary = process.argv.includes("--summary");
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

const PluginDefinitionNameMatcher = /definePlugin\(\{\s*(["'])?name\1:\s*(["'`])(.+?)\2/;
export async function resolvePluginName(base: string, dirent: Dirent): Promise<string> {
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

export async function exists(path: PathLike): Promise<boolean> {
    try {
        await access(path, FsConstants.F_OK);
        return true;
    } catch {
        return false;
    }
}

// https://github.com/evanw/esbuild/issues/619#issuecomment-751995294
export const makeAllPackagesExternalPlugin: esbuild.Plugin = {
    name: "make-all-packages-external",
    setup(build) {
        const filter = /^[^./]|^\.[^./]|^\.\.[^/]/; // Must not start with "/" or "./" or "../"
        build.onResolve({ filter }, args => ({ path: args.path, external: true }));
    }
};

export const globPlugins = (kind: "web" | "discordDesktop" | "vencordDesktop"): esbuild.Plugin => ({
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
                            (target === "vencordDesktop" && kind !== "vencordDesktop");

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
                    metaCode += `[${mod}.name]:${JSON.stringify({ folderName, userPlugin })},\n`; // TODO: add excluded plugins to display in the UI?
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

export const gitHashPlugin: esbuild.Plugin = {
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

export const gitRemotePlugin: esbuild.Plugin = {
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

export const fileUrlPlugin: esbuild.Plugin = {
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
export const stylePlugin: esbuild.Plugin = {
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

interface ConsoleLock {
    unlock: () => void;
}
let consoleLockPromise: PromiseWithResolvers<undefined> | undefined = undefined;
export let consoleLock: ConsoleLock | undefined = undefined;
export async function lockConsole(): Promise<ConsoleLock> {
    while (consoleLockPromise !== undefined) {
        await consoleLockPromise.promise;
    }
    consoleLockPromise = promiseWithResolvers<undefined>();
    const { resolve } = consoleLockPromise;
    const unlock = () => {
        consoleLockPromise = undefined;
        consoleLock = undefined;
        return resolve(undefined);
    };
    return consoleLock = { unlock };
}

const sizeWarningThreshold = 1024 * 1024;
export const logRebuildToConsolePlugin: esbuild.Plugin = {
    name: "log-rebuild-to-console-plugin",
    setup: build => {
        let consoleLock: ConsoleLock | undefined = undefined;
        let startMs: number = 0;
        let index = 0;
        build.onStart(async () => {
            startMs = Date.now();
            // If esbuild is also logging anything, lock early.
            if (consoleLock === undefined && build.initialOptions.logLevel !== "silent") consoleLock = await lockConsole();
        });
        build.onEnd(async result => {
            const endMs = Date.now();
            if (consoleLock === undefined) consoleLock = await lockConsole();
            // in case you're wondering where the colors are: https://github.com/nodejs/node/pull/49205
            console.group(`⚡ Rebuild ${index} of ${build.initialOptions.outfile} ${result.errors.length > 0 ? "failed" : "done"} in ${endMs - startMs}ms`);
            let group = 1;
            if (build.initialOptions.logLevel === "silent") {
                const initialLogLevel = (build.initialOptions as any).initialLogLevel as esbuild.LogLevel ?? build.initialOptions.logLevel;
                switch (initialLogLevel) {
                    case "info":
                        if (result.metafile !== undefined) {
                            // our very own summary
                            const { outputs } = result.metafile;
                            for (const path of Object.getOwnPropertyNames(outputs).sort()) {
                                const output = outputs[path];
                                const sizeWarning = output.bytes > sizeWarningThreshold;
                                console.log(
                                    "%c%s%c (%c%d b%s%c, entryPoint: %o)",
                                    "font-weight: bold",
                                    path,
                                    "font-weight: reset",
                                    sizeWarning ? "color: yellow" : "color: cyan",
                                    output.bytes,
                                    sizeWarning ? " ⚠️" : "",
                                    "color: unset",
                                    output.entryPoint,
                                );
                            }
                        }
                    // eslint-disable-next-line no-fallthrough
                    case "warning":
                        if (result.warnings.length > 0) {
                            while (group > 0) {
                                console.groupEnd();
                                group--;
                            }
                            for (const formattedMessage of await esbuild.formatMessages(result.warnings, { kind: "warning", color: true })) {
                                console.warn("%s", formattedMessage);
                            }
                        }
                    // eslint-disable-next-line no-fallthrough
                    case "error":
                        if (result.errors.length > 0) {
                            while (group > 0) {
                                console.groupEnd();
                                group--;
                            }
                            for (const formattedMessage of await esbuild.formatMessages(result.errors, { kind: "error", color: true })) {
                                console.error("%s", formattedMessage);
                            }
                        }
                }
            }
            while (group > 0) {
                console.groupEnd();
                group--;
            }
            if (!((build.initialOptions as any).summary as unknown)) consoleLock?.unlock();
            startMs = 0;
            index++;
            return {};
        });
        build.onDispose(() => {
            consoleLock?.unlock();
        });
    },
};

export function makeContextPromise<
    SpecificOptions extends esbuild.BuildOptions = esbuild.BuildOptions,
>(buildOptions: SpecificOptions): Promise<esbuild.BuildContext<SpecificOptions>> {
    const initialLogLevel = buildOptions.logLevel ?? "info";
    return esbuild.context(Object.defineProperty({
        ...buildOptions,
        metafile: true,
        logLevel: initialLogLevel === "error" || initialLogLevel === "warning" || initialLogLevel === "info" ? "silent" : initialLogLevel,
        plugins: [
            ...(buildOptions.plugins ?? []),
            logRebuildToConsolePlugin,
        ],
    }, "initialLogLevel", { configurable: true, writable: true, enumerable: false, value: buildOptions.logLevel }));
}

export async function makeBuildPromise<
    SpecificBuildOptions extends esbuild.BuildOptions = esbuild.BuildOptions,
    SpecificWatchOptions extends esbuild.WatchOptions = esbuild.WatchOptions,
>(
    context: esbuild.BuildContext<SpecificBuildOptions>,
    buildOptions: SpecificBuildOptions,
    watchOptions: SpecificWatchOptions,
): Promise<esbuild.BuildResult<SpecificBuildOptions> | void> {
    let buildResult: esbuild.BuildResult | void;
    // `esbuild.build` internally calls `rebuild`, but we have to call `build` first for a summary.
    // https://github.com/evanw/esbuild/issues/2886
    try {
        const buildOpts = {
            ...buildOptions,
            metafile: true,
            plugins: [
                ...(buildOptions.plugins ?? []),
                logRebuildToConsolePlugin,
            ],
        };
        if (summary) {
            buildResult = await esbuild.build(buildOpts);
            if (watch) await context.watch(watchOptions);
        } else {
            buildResult = watch ? await context.watch(watchOptions) : await context.rebuild();
        }
        return buildResult;
    } catch (error) {
        context.dispose();
        if (watch) {
            throw error;
        } else {
            process.exitCode = 1;
        }
    }
}

export const commonOpts: esbuild.CommonOptions = {
    logLevel: "info",
    minify: !watch,
    sourcemap: watch ? "inline" : undefined,
    legalComments: "linked",
    jsxFactory: "VencordCreateElement",
    jsxFragment: "VencordFragment",
};

export const buildOpts: esbuild.BuildOptions = {
    ...commonOpts,
    banner,
    bundle: true,
    external: ["~plugins", "~git-hash", "~git-remote", "/assets/*"],
    inject: ["./scripts/build/inject/react.mjs"],
    plugins: [fileUrlPlugin, gitHashPlugin, gitRemotePlugin, stylePlugin],
    // Work around https://github.com/evanw/esbuild/issues/2460
    tsconfig: "./scripts/build/tsconfig.esbuild.json"
};

export const watchOpts: esbuild.WatchOptions = {
};

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

import { WEBPACK_CHUNK } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { canonicalizeReplacement } from "@utils/patches";
import { PatchReplacement } from "@utils/types";

import { traceFunction } from "../debug/Tracer";
import { _initWebpack } from ".";

let webpackChunk: any[];

const logger = new Logger("WebpackInterceptor", "#8caaee");

if (window[WEBPACK_CHUNK]) {
    logger.info(`Patching ${WEBPACK_CHUNK}.push (was already existent, likely from cache!)`);
    _initWebpack(window[WEBPACK_CHUNK]);
    patchPush(window[WEBPACK_CHUNK]);
} else {
    Object.defineProperty(window, WEBPACK_CHUNK, {
        get: () => webpackChunk,
        set: v => {
            if (v?.push) {
                if (!v.push.$$vencordOriginal) {
                    logger.info(`Patching ${WEBPACK_CHUNK}.push`);
                    patchPush(v);
                }

                if (_initWebpack(v)) {
                    logger.info("Successfully initialised Vencord webpack");
                    // @ts-ignore
                    delete window[WEBPACK_CHUNK];
                    window[WEBPACK_CHUNK] = v;
                }
            }
            webpackChunk = v;
        },
        configurable: true
    });

    // wreq.m is the webpack module factory.
    // normally, this is populated via webpackGlobal.push, which we patch below.
    // However, Discord has their .m prepopulated.
    // Thus, we use this hack to immediately access their wreq.m and patch all already existing factories
    //
    // Update: Discord now has TWO webpack instances. Their normal one and sentry
    // Sentry does not push chunks to the global at all, so this same patch now also handles their sentry modules
    Object.defineProperty(Function.prototype, "m", {
        set(v: any) {
            // When using react devtools or other extensions, we may also catch their webpack here.
            // This ensures we actually got the right one
            if (new Error().stack?.includes("discord.com")) {
                logger.info("Found webpack module factory");
                patchFactories(v);
            }

            Object.defineProperty(this, "m", {
                value: v,
                configurable: true,
            });
        },
        configurable: true
    });
}

function patchPush(webpackGlobal: any) {
    function handlePush(chunk: any) {
        try {
            patchFactories(chunk[1]);
        } catch (err) {
            logger.error("Error in handlePush", err);
        }

        return handlePush.$$vencordOriginal.call(webpackGlobal, chunk);
    }

    handlePush.$$vencordOriginal = webpackGlobal.push;
    // Webpack overwrites .push with its own push like so: `d.push = n.bind(null, d.push.bind(d));`
    // it wraps the old push (`d.push.bind(d)`). this old push is in this case our handlePush.
    // If we then repatched the new push, we would end up with recursive patching, which leads to our patches
    // being applied multiple times.
    // Thus, override bind to use the original push
    handlePush.bind = (...args: unknown[]) => handlePush.$$vencordOriginal.bind(...args);

    Object.defineProperty(webpackGlobal, "push", {
        get: () => handlePush,
        set(v) {
            handlePush.$$vencordOriginal = v;
        },
        configurable: true
    });
}

function patchFactories(factories: Record<string | number, (module: { exports: any; }, exports: any, require: any) => void>) {
    const { subscriptions, listeners } = Vencord.Webpack;
    const { patches } = Vencord.Plugins;

    for (const id in factories) {
        let mod = factories[id];
        // Discords Webpack chunks for some ungodly reason contain random
        // newlines. Cyn recommended this workaround and it seems to work fine,
        // however this could potentially break code, so if anything goes weird,
        // this is probably why.
        // Additionally, `[actual newline]` is one less char than "\n", so if Discord
        // ever targets newer browsers, the minifier could potentially use this trick and
        // cause issues.
        //
        // 0, prefix is to turn it into an expression: 0,function(){} would be invalid syntax without the 0,
        let code: string = "0," + mod.toString().replaceAll("\n", "");
        const originalMod = mod;
        const patchedBy = new Set();

        const factory = factories[id] = function (module, exports, require) {
            try {
                mod(module, exports, require);
            } catch (err) {
                // Just rethrow discord errors
                if (mod === originalMod) throw err;

                logger.error("Error in patched chunk", err);
                return void originalMod(module, exports, require);
            }

            exports = module.exports;

            if (!exports) return;

            // There are (at the time of writing) 11 modules exporting the window
            // Make these non enumerable to improve webpack search performance
            if (exports === window && require.c) {
                Object.defineProperty(require.c, id, {
                    value: require.c[id],
                    enumerable: false,
                    configurable: true,
                    writable: true
                });
                return;
            }

            for (const callback of listeners) {
                try {
                    callback(exports, id);
                } catch (err) {
                    logger.error("Error in webpack listener", err);
                }
            }

            for (const [filter, callback] of subscriptions) {
                try {
                    if (filter(exports)) {
                        subscriptions.delete(filter);
                        callback(exports, id);
                    } else if (exports.default && filter(exports.default)) {
                        subscriptions.delete(filter);
                        callback(exports.default, id);
                    }
                } catch (err) {
                    logger.error("Error while firing callback for webpack chunk", err);
                }
            }
        } as any as { toString: () => string, original: any, (...args: any[]): void; };

        // for some reason throws some error on which calling .toString() leads to infinite recursion
        // when you force load all chunks???
        factory.toString = () => mod.toString();
        factory.original = originalMod;

        for (let i = 0; i < patches.length; i++) {
            const patch = patches[i];
            const executePatch = traceFunction(`patch by ${patch.plugin}`, (match: string | RegExp, replace: string) => code.replace(match, replace));
            if (patch.predicate && !patch.predicate()) continue;

            if (code.includes(patch.find)) {
                patchedBy.add(patch.plugin);

                const previousMod = mod;
                const previousCode = code;

                // we change all patch.replacement to array in plugins/index
                for (const replacement of patch.replacement as PatchReplacement[]) {
                    if (replacement.predicate && !replacement.predicate()) continue;
                    const lastMod = mod;
                    const lastCode = code;

                    canonicalizeReplacement(replacement, patch.plugin);

                    try {
                        const newCode = executePatch(replacement.match, replacement.replace as string);
                        if (newCode === code) {
                            if (!patch.noWarn) {
                                logger.warn(`Patch by ${patch.plugin} had no effect (Module id is ${id}): ${replacement.match}`);
                                if (IS_DEV) {
                                    logger.debug("Function Source:\n", code);
                                }
                            }

                            if (patch.group) {
                                logger.warn(`Undoing patch group ${patch.find} by ${patch.plugin} because replacement ${replacement.match} had no effect`);
                                code = previousCode;
                                mod = previousMod;
                                patchedBy.delete(patch.plugin);
                                break;
                            }
                        } else {
                            code = newCode;
                            mod = (0, eval)(`// Webpack Module ${id} - Patched by ${[...patchedBy].join(", ")}\n${newCode}\n//# sourceURL=WebpackModule${id}`);
                        }
                    } catch (err) {
                        logger.error(`Patch by ${patch.plugin} errored (Module id is ${id}): ${replacement.match}\n`, err);

                        if (IS_DEV) {
                            const changeSize = code.length - lastCode.length;
                            const match = lastCode.match(replacement.match)!;

                            // Use 200 surrounding characters of context
                            const start = Math.max(0, match.index! - 200);
                            const end = Math.min(lastCode.length, match.index! + match[0].length + 200);
                            // (changeSize may be negative)
                            const endPatched = end + changeSize;

                            const context = lastCode.slice(start, end);
                            const patchedContext = code.slice(start, endPatched);

                            // inline require to avoid including it in !IS_DEV builds
                            const diff = (require("diff") as typeof import("diff")).diffWordsWithSpace(context, patchedContext);
                            let fmt = "%c %s ";
                            const elements = [] as string[];
                            for (const d of diff) {
                                const color = d.removed
                                    ? "red"
                                    : d.added
                                        ? "lime"
                                        : "grey";
                                fmt += "%c%s";
                                elements.push("color:" + color, d.value);
                            }

                            logger.errorCustomFmt(...Logger.makeTitle("white", "Before"), context);
                            logger.errorCustomFmt(...Logger.makeTitle("white", "After"), patchedContext);
                            const [titleFmt, ...titleElements] = Logger.makeTitle("white", "Diff");
                            logger.errorCustomFmt(titleFmt + fmt, ...titleElements, ...elements);
                        }

                        patchedBy.delete(patch.plugin);
                        if (patch.group) {
                            logger.warn(`Undoing patch group ${patch.find} by ${patch.plugin} because replacement ${replacement.match} errored`);
                            code = previousCode;
                            mod = previousMod;
                            break;
                        }

                        code = lastCode;
                        mod = lastMod;
                    }
                }

                if (!patch.all) patches.splice(i--, 1);
            }
        }
    }
}

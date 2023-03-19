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
import Logger from "@utils/Logger";
import { canonicalizeReplacement } from "@utils/patches";
import { PatchReplacement } from "@utils/types";

import { traceFunction } from "../debug/Tracer";
import { _initWebpack } from ".";

let webpackChunk: any[];

const logger = new Logger("WebpackInterceptor", "#8caaee");

Object.defineProperty(window, WEBPACK_CHUNK, {
    get: () => webpackChunk,
    set: v => {
        if (v?.push !== Array.prototype.push) {
            logger.info(`Patching ${WEBPACK_CHUNK}.push`);
            _initWebpack(v);
            patchPush();
            // @ts-ignore
            delete window[WEBPACK_CHUNK];
            window[WEBPACK_CHUNK] = v;
        }
        webpackChunk = v;
    },
    configurable: true
});

function patchPush() {
    function handlePush(chunk: any) {
        try {
            const modules = chunk[1];
            const { subscriptions, listeners } = Vencord.Webpack;
            const { patches } = Vencord.Plugins;

            for (const id in modules) {
                let mod = modules[id];
                // Discords Webpack chunks for some ungodly reason contain random
                // newlines. Cyn recommended this workaround and it seems to work fine,
                // however this could potentially break code, so if anything goes weird,
                // this is probably why.
                // Additionally, `[actual newline]` is one less char than "\n", so if Discord
                // ever targets newer browsers, the minifier could potentially use this trick and
                // cause issues.
                let code: string = mod.toString().replaceAll("\n", "");
                // a very small minority of modules use function() instead of arrow functions,
                // but, unnamed toplevel functions aren't valid. However 0, function() makes it a statement
                if (code.startsWith("function(")) {
                    code = "0," + code;
                }
                const originalMod = mod;
                const patchedBy = new Set();

                const factory = modules[id] = function (module, exports, require) {
                    try {
                        mod(module, exports, require);
                    } catch (err) {
                        // Just rethrow discord errors
                        if (mod === originalMod) throw err;

                        logger.error("Error in patched chunk", err);
                        return void originalMod(module, exports, require);
                    }

                    // There are (at the time of writing) 11 modules exporting the window
                    // Make these non enumerable to improve webpack search performance
                    if (module.exports === window) {
                        Object.defineProperty(require.c, id, {
                            value: require.c[id],
                            enumerable: false,
                            configurable: true,
                            writable: true
                        });
                        return;
                    }

                    const numberId = Number(id);

                    for (const callback of listeners) {
                        try {
                            callback(exports, numberId);
                        } catch (err) {
                            logger.error("Error in webpack listener", err);
                        }
                    }

                    for (const [filter, callback] of subscriptions) {
                        try {
                            if (filter(exports)) {
                                subscriptions.delete(filter);
                                callback(exports, numberId);
                            } else if (typeof exports === "object") {
                                if (exports.default && filter(exports.default)) {
                                    subscriptions.delete(filter);
                                    callback(exports.default, numberId);
                                }

                                for (const nested in exports) if (nested.length <= 3) {
                                    if (exports[nested] && filter(exports[nested])) {
                                        subscriptions.delete(filter);
                                        callback(exports[nested], numberId);
                                    }
                                }
                            }
                        } catch (err) {
                            logger.error("Error while firing callback for webpack chunk", err);
                        }
                    }
                } as any as { toString: () => string, original: any, (...args: any[]): void; };

                // for some reason throws some error on which calling .toString() leads to infinite recursion
                // when you force load all chunks???
                try {
                    factory.toString = () => mod.toString();
                    factory.original = originalMod;
                } catch { }

                for (let i = 0; i < patches.length; i++) {
                    const patch = patches[i];
                    const executePatch = traceFunction(`patch by ${patch.plugin}`, (match: string | RegExp, replace: string) => code.replace(match, replace));
                    if (patch.predicate && !patch.predicate()) continue;

                    if (code.includes(patch.find)) {
                        patchedBy.add(patch.plugin);

                        // we change all patch.replacement to array in plugins/index
                        for (const replacement of patch.replacement as PatchReplacement[]) {
                            if (replacement.predicate && !replacement.predicate()) continue;
                            const lastMod = mod;
                            const lastCode = code;

                            canonicalizeReplacement(replacement, patch.plugin);

                            try {
                                const newCode = executePatch(replacement.match, replacement.replace as string);
                                if (newCode === code && !patch.noWarn) {
                                    logger.warn(`Patch by ${patch.plugin} had no effect (Module id is ${id}): ${replacement.match}`);
                                    if (IS_DEV) {
                                        logger.debug("Function Source:\n", code);
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
                                code = lastCode;
                                mod = lastMod;
                                patchedBy.delete(patch.plugin);
                            }
                        }

                        if (!patch.all) patches.splice(i--, 1);
                    }
                }
            }
        } catch (err) {
            logger.error("Error in handlePush", err);
        }

        return handlePush.original.call(window[WEBPACK_CHUNK], chunk);
    }

    handlePush.original = window[WEBPACK_CHUNK].push;
    Object.defineProperty(window[WEBPACK_CHUNK], "push", {
        get: () => handlePush,
        set: v => (handlePush.original = v),
        configurable: true
    });
}

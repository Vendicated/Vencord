import { WEBPACK_CHUNK } from './constants';
import Logger from "./logger";
import { _initWebpack } from "../webpack";

let webpackChunk: any[];

const logger = new Logger("WebpackInterceptor", "#8caaee");

Object.defineProperty(window, WEBPACK_CHUNK, {
    get: () => webpackChunk,
    set: (v) => {
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
    function handlePush(chunk) {
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
                let code = mod.toString().replaceAll("\n", "");
                const originalMod = mod;
                const patchedBy = new Set();

                modules[id] = function (module, exports, require) {
                    try {
                        mod(module, exports, require);
                    } catch (err) {
                        // Just rethrow discord errors
                        if (mod === originalMod) throw err;

                        logger.error("Error in patched chunk", err);
                        return originalMod(module, exports, require);
                    }

                    for (const callback of listeners) {
                        try {
                            callback(exports);
                        } catch (err) {
                            logger.error("Error in webpack listener", err);
                        }
                    }
                    for (const [filter, callback] of subscriptions) {
                        try {
                            if (filter(exports)) {
                                subscriptions.delete(filter);
                                callback(exports);
                            } else if (exports.default && filter(exports.default)) {
                                subscriptions.delete(filter);
                                callback(exports.default);
                            }
                        } catch (err) {
                            logger.error("Error while firing callback for webpack chunk", err);
                        }
                    }
                };
                modules[id].toString = () => mod.toString();
                modules[id].original = originalMod;

                for (let i = 0; i < patches.length; i++) {
                    const patch = patches[i];
                    if (code.includes(patch.find)) {
                        patchedBy.add(patch.plugin);
                        // @ts-ignore we change all patch.replacement to array in plugins/index
                        for (const replacement of patch.replacement) {
                            const lastMod = mod;
                            const lastCode = code;
                            try {
                                const newCode = code.replace(replacement.match, replacement.replace);
                                if (newCode === code) {
                                    logger.warn(`Patch by ${patch.plugin} had no effect: ${replacement.match}`);
                                    logger.debug("Function Source:\n", code);
                                } else {
                                    code = newCode;
                                    mod = (0, eval)(`// Webpack Module ${id} - Patched by ${[...patchedBy].join(", ")}\n${newCode}\n//# sourceURL=WebpackModule${id}`);
                                }
                            } catch (err) {
                                // TODO - More meaningful errors. This probably means moving away from string.replace
                                // in favour of manual matching. Then cut out the context and log some sort of
                                // diff
                                logger.error("Failed to apply patch of", patch.plugin, err);
                                logger.debug("Original Source\n", lastCode);
                                logger.debug("Patched Source\n", code);
                                code = lastCode;
                                mod = lastMod;
                                patchedBy.delete(patch.plugin);
                            }
                        }
                        patches.splice(i--, 1);
                    }
                }
            }
        } catch (err) {
            logger.error("oopsie", err);
        }

        return handlePush.original.call(window[WEBPACK_CHUNK], chunk);
    }

    handlePush.original = window[WEBPACK_CHUNK].push;
    Object.defineProperty(window[WEBPACK_CHUNK], "push", {
        get: () => handlePush,
        set: (v) => (handlePush.original = v),
        configurable: true
    });
}


const { WEBPACK_CHUNK } = require("../constants");
const electron = require("electron");
const { init } = require("./webpack");

let webpackChunk;

Object.defineProperty(electron.webFrame.top.context, WEBPACK_CHUNK, {
    get: () => webpackChunk,
    set: (v) => {
        // There are two possible values for push.
        // - Native push with toString result of function push() { [native code] }
        // - Webpack's push with toString result of function() { [native code] }
        // We don't want to override the native one, so check for "push"
        if (v && !v.push.toString().includes("push")) {
            init(v);
            electron.webFrame.executeJavaScript(`(() => (${patchPush.toString()})())();`);
            delete electron.webFrame.top.context[WEBPACK_CHUNK];
            electron.webFrame.top.context[WEBPACK_CHUNK] = v;
        }
        webpackChunk = v;
    },
    configurable: true
});

function patchPush() {
    function handlePush(chunk, noIdeaWhatThisIs) {
        const modules = chunk[1];
        const { subscriptions } = Vencord.Webpack;
        const { patches } = Vencord;

        try {
            for (const id in modules) {
                let mod = modules[id];
                let code = mod.toString();
                const originalMod = mod;
                const patchedBy = new Set();

                modules[id] = function (module, exports, require) {
                    try {
                        mod(module, exports, require);
                    } catch (err) {
                        // Just rethrow discord errors
                        if (mod === originalMod) throw err;

                        console.error("[Webpack] Error in patched chunk", err);
                        return originalMod(module, exports, require);
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
                            console.error("[Webpack] Error while firing callback for webpack chunk", err);
                        }
                    }
                };

                for (let i = 0; i < patches.length; i++) {
                    const patch = patches[i];
                    if (code.includes(patch.find)) {
                        patchedBy.add(patch.plugin);
                        const lastMod = mod;
                        const lastCode = code;
                        try {
                            const newCode = code.replace(patch.replacement.match, patch.replacement.replace);
                            const newMod = eval(`// Webpack Module ${id} - Patched by ${[...patchedBy].join(", ")}\n${newCode}\n//# sourceURL=WebpackModule${id}`);
                            code = newCode;
                            mod = newMod;
                            patches.splice(i--, 1);
                        } catch (err) {
                            console.error("[Webpack] Failed to apply patch of", patch.plugin, err);
                            code = lastCode;
                            mod = lastMod;
                            patchedBy.delete(patch.plugin);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("oopsie", err);
        }

        return handlePush.original.call(window[Vencord.Constants.WEBPACK_CHUNK], chunk, noIdeaWhatThisIs);
    }

    handlePush.original = window[Vencord.Constants.WEBPACK_CHUNK].push;
    Object.defineProperty(window[Vencord.Constants.WEBPACK_CHUNK], "push", {
        get: () => handlePush,
        set: (v) => (handlePush.original = v),
        configurable: true
    });
}


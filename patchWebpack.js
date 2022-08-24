const { WEBPACK_CHUNK } = require("./constants");
const electron = require("electron");
const { patches } = require("./patches");
const { init } = require("./utils/webpack");

let originalPush;
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
            patchPush(v);
            delete electron.webFrame.top.context[WEBPACK_CHUNK];
            electron.webFrame.top.context[WEBPACK_CHUNK] = v;
        }
        webpackChunk = v;
    },
    configurable: true
});

function patchPush(instance) {
    originalPush = instance.push;
    Object.defineProperty(instance, "push", {
        get: () => handlePush,
        set: (v) => (originalPush = v),
        configurable: true
    });
}

function handlePush(chunk, noIdeaWhatThisIs) {
    const modules = chunk[1];
    try {
        for (const id in modules) {
            const mod = modules[id];
            let code = mod.toString();

            for (let i = 0; i < patches.length; i++) {
                const patch = patches[i];
                if (code.includes(patch.find)) {
                    try {
                        const newCode = code.replace(patch.replacement.match, patch.replacement.replace);
                        // Todo make this less cursed
                        const newMod = eval(`// Webpack Module ${id} - Patched by ${patch.plugin}\n(window)=>{return ${newCode}}\n//# sourceURL=WebpackModule${id}`)(electron.webFrame.top.context);
                        modules[id] = function () {
                            try {
                                return newMod(...arguments);
                            } catch (err) {
                                console.error("ERROR IN PATCH", err);
                                return mod(...arguments);
                            }
                        };
                        code = newCode;
                        patches.splice(i--, 1);
                    } catch (err) {
                        console.error("Failed to apply patch", err);
                    }
                }
            }
        }
    } catch (err) {
        console.error("oopsie", err);
    }

    return originalPush.call(window[WEBPACK_CHUNK], chunk, noIdeaWhatThisIs);
}

const electron = require("electron");
const { WEBPACK_CHUNK } = require("./constants");
const Api = require("./VencordApi");

const { context } = electron.webFrame.top;
context.global = context;
context.require = require;

// Make shidd available in the isolated context
Object.defineProperty(window, WEBPACK_CHUNK, {
    get: () => context[WEBPACK_CHUNK]
});
Object.defineProperty(window, "__SENTRY__", {
    get: () => context["__SENTRY__"]
});

global.Vencord = new Api();

Object.defineProperty(context, "Vencord", {
    value: Vencord
});

require("./patchWebpack");

require(process.env.DISCORD_PRELOAD);

// Make app.asar npms such as request work. Not needed tbh
// Module.globalPaths.push(
// path.resolve(process.env.APP_PATH, "..", "app.asar", "node_modules")
// );


import electron, { app, BrowserWindowConstructorOptions } from "electron";
import installExt, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";
import { join } from "path";

console.log("[Vencord] Starting up...");

class BrowserWindow extends electron.BrowserWindow {

    constructor(options: BrowserWindowConstructorOptions) {
        if (options?.webPreferences?.preload && options.title) {
            const original = options.webPreferences.preload;
            options.webPreferences.preload = join(__dirname, "preload.js");

            process.env.APP_PATH = app.getAppPath();
            process.env.DISCORD_PRELOAD = original;
        }
        super(options);
    }
}
Object.assign(BrowserWindow, electron.BrowserWindow);

// Replace electrons exports with our custom BrowserWindow
const electronPath = require.resolve("electron");
delete require.cache[electronPath]!.exports;
require.cache[electronPath]!.exports = {
    ...electron,
    BrowserWindow
};

// Patch appSettingsa to force enable devtools
Object.defineProperty(global, "appSettings", {
    set: (v) => {
        v.set("DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING", true);
        delete global.appSettings;
        global.appSettings = v;
    },
    configurable: true
});

process.env.DATA_DIR = join(app.getPath("userData"), "..", "Vencord");

electron.app.whenReady().then(() => {
    /* installExt(REACT_DEVELOPER_TOOLS)
        .then(() => console.log("Installed React DevTools"))
        .catch((err) => console.error("Failed to install React DevTools", err)); */

    // Remove CSP
    electron.session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, url }, cb) => {
        if (responseHeaders && url.endsWith(".css")) {
            delete responseHeaders["content-security-policy-report-only"];
            delete responseHeaders["content-security-policy"];
            // probably makes github raw work? not tested.
            responseHeaders["content-type"] = ["text/css"];
            responseHeaders;
        }
        cb({ cancel: false, responseHeaders: responseHeaders });
    });

    // Drop science and sentry requests
    electron.session.defaultSession.webRequest.onBeforeRequest(
        { urls: ["https://*/api/v*/science", "https://sentry.io/*"] },
        (_, callback) => callback({ cancel: true })
    );
});

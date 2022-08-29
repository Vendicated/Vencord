
import electron, { app, BrowserWindowConstructorOptions } from "electron";
import installExt, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";
import { join } from "path";
import { initIpc } from './ipcMain';

console.log("[Vencord] Starting up...");

class BrowserWindow extends electron.BrowserWindow {
    constructor(options: BrowserWindowConstructorOptions) {
        if (options?.webPreferences?.preload && options.title) {
            const original = options.webPreferences.preload;
            options.webPreferences.preload = join(__dirname, "preload.js");

            process.env.DISCORD_PRELOAD = original;

            super(options);
            initIpc(this);
        } else super(options);
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

// Patch appSettings to force enable devtools
Object.defineProperty(global, "appSettings", {
    set: (v: typeof global.appSettings) => {
        v.set("DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING", true);
        // @ts-ignore
        delete global.appSettings;
        global.appSettings = v;
    },
    configurable: true
});

process.env.DATA_DIR = join(app.getPath("userData"), "..", "Vencord");

electron.app.whenReady().then(() => {
    installExt(REACT_DEVELOPER_TOOLS)
        .then(() => console.log("Installed React DevTools"))
        .catch((err) => console.error("Failed to install React DevTools", err));

    // Remove CSP
    electron.session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, url }, cb) => {
        if (responseHeaders) {
            delete responseHeaders["content-security-policy-report-only"];
            delete responseHeaders["content-security-policy"];
        }
        cb({ cancel: false, responseHeaders });
    });

    // Drop science and sentry requests
    electron.session.defaultSession.webRequest.onBeforeRequest(
        { urls: ["https://*/api/v*/science", "https://sentry.io/*"] },
        (_, callback) => callback({ cancel: true })
    );
});

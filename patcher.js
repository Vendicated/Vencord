console.log("Bruhhhh Vencord moment");

const electron = require("electron");
const { default: installExtension, REACT_DEVELOPER_TOOLS } = require("electron-devtools-installer");

class BrowserWindow extends electron.BrowserWindow {
    constructor(options) {
        if (!options?.webPreferences?.preload || !options.title) return super(options);

        const original = options.webPreferences.preload;
        options.webPreferences.preload = require("path").join(__dirname, "preload.js");
        process.env.APP_PATH = electron.app.getAppPath();
        process.env.DISCORD_PRELOAD = original;

        super(options);
    }
}
Object.assign(BrowserWindow, electron.BrowserWindow);

// Patch Electrons exports
delete require.cache[require.resolve("electron")].exports;
require.cache[require.resolve("electron")].exports = {
    ...electron,
    BrowserWindow
};

// Force enable devtools on stable
Object.defineProperty(global, "appSettings", {
    set: (v) => {
        v.set("DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING", true);
        delete global.appSettings;
        global.appSettings = v;
    },
    configurable: true
});

electron.app.whenReady().then(() => {
    installExtension(REACT_DEVELOPER_TOOLS)
        .then((name) => console.log("Installed React DevTools"))
        .catch((err) => console.error("Failed to install React DevTools", err));
});

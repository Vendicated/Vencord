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

import electron, { app, BrowserWindowConstructorOptions } from "electron";
import { readFileSync } from "fs";
import { dirname, join } from "path";

import { initIpc } from "./ipcMain";
import { installExt } from "./ipcMain/extensions";
import { readSettings } from "./ipcMain/index";

console.log("[Vencord] Starting up...");

// Our injector file at app/index.js
const injectorPath = require.main!.filename;

// special discord_arch_electron injection method
const asarName = require.main!.path.endsWith("app.asar") ? "_app.asar" : "app.asar";

// The original app.asar
const asarPath = join(dirname(injectorPath), "..", asarName);

const discordPkg = require(join(asarPath, "package.json"));
require.main!.filename = join(asarPath, discordPkg.main);

// @ts-ignore Untyped method? Dies from cringe
app.setAppPath(asarPath);

// Repatch after host updates on Windows
if (process.platform === "win32")
    require("./patchWin32Updater");

class BrowserWindow extends electron.BrowserWindow {
    constructor(options: BrowserWindowConstructorOptions) {
        if (options?.webPreferences?.preload && options.title) {
            const original = options.webPreferences.preload;
            options.webPreferences.preload = join(__dirname, "preload.js");
            options.webPreferences.sandbox = false;

            process.env.DISCORD_PRELOAD = original;

            super(options);
            initIpc(this);
        } else super(options);
    }
}
Object.assign(BrowserWindow, electron.BrowserWindow);
// esbuild may rename our BrowserWindow, which leads to it being excluded
// from getFocusedWindow(), so this is necessary
// https://github.com/discord/electron/blob/13-x-y/lib/browser/api/browser-window.ts#L60-L62
Object.defineProperty(BrowserWindow, "name", { value: "BrowserWindow", configurable: true });

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
    // Source Maps! Maybe there's a better way but since the renderer is executed
    // from a string I don't think any other form of sourcemaps would work
    electron.protocol.registerFileProtocol("vencord", ({ url: unsafeUrl }, cb) => {
        let url = unsafeUrl.slice("vencord://".length);
        if (url.endsWith("/")) url = url.slice(0, -1);
        switch (url) {
            case "renderer.js.map":
            case "preload.js.map":
            case "patcher.js.map": // doubt
                cb(join(__dirname, url));
                break;
            default:
                cb({ statusCode: 403 });
        }
    });

    try {
        const settings = JSON.parse(readSettings());
        if (settings.enableReactDevtools)
            installExt("fmkadmapgofadopljbjfkapdkoienihi")
                .then(() => console.info("[Vencord] Installed React Developer Tools"))
                .catch(err => console.error("[Vencord] Failed to install React Developer Tools", err));
    } catch { }

    // Remove CSP
    electron.session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, url }, cb) => {
        if (responseHeaders) {
            delete responseHeaders["content-security-policy-report-only"];
            delete responseHeaders["content-security-policy"];

            // Fix hosts that don't properly set the content type, such as
            // raw.githubusercontent.com
            if (url.endsWith(".css"))
                responseHeaders["content-type"] = ["text/css"];
        }
        cb({ cancel: false, responseHeaders });
    });
});

console.log("[Vencord] Loading original Discord app.asar");
// Legacy Vencord Injector requires "../app.asar". However, because we
// restore the require.main above this is messed up, so monkey patch Module._load to
// redirect such requires
// FIXME: remove this eventually
if (readFileSync(injectorPath, "utf-8").includes('require("../app.asar")')) {
    console.warn("[Vencord] [--> WARNING <--] You have a legacy Vencord install. Please reinject");
    const Module = require("module");
    const loadModule = Module._load;
    Module._load = function (path: string) {
        if (path === "../app.asar") {
            Module._load = loadModule;
            arguments[0] = require.main!.filename;
        }
        return loadModule.apply(this, arguments);
    };
} else {
    console.log(require.main!.filename);
    require(require.main!.filename);
}

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

import { onceDefined } from "@utils/onceDefined";
import electron, { app, BrowserWindowConstructorOptions, Menu } from "electron";
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

if (!process.argv.includes("--vanilla")) {
    // Repatch after host updates on Windows
    if (process.platform === "win32") {
        require("./patchWin32Updater");

        const originalBuild = Menu.buildFromTemplate;
        Menu.buildFromTemplate = function (template) {
            if (template[0]?.label === "&File") {
                const { submenu } = template[0];
                if (Array.isArray(submenu)) {
                    submenu.push({
                        label: "Quit (Hidden)",
                        visible: false,
                        acceleratorWorksWhenHidden: true,
                        accelerator: "Control+Q",
                        click: () => app.quit()
                    });
                }
            }
            return originalBuild.call(this, template);
        };
    }

    let settings = {} as any;
    try {
        settings = JSON.parse(readSettings());
    } catch { }

    class BrowserWindow extends electron.BrowserWindow {
        constructor(options: BrowserWindowConstructorOptions) {
            if (options?.webPreferences?.preload && options.title) {
                const original = options.webPreferences.preload;
                options.webPreferences.preload = join(__dirname, "preload.js");
                options.webPreferences.sandbox = false;
                options.frame = settings.frameless;

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
    onceDefined(global, "appSettings", s =>
        s.set("DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING", true)
    );

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
            if (settings?.enableReactDevtools)
                installExt("fmkadmapgofadopljbjfkapdkoienihi")
                    .then(() => console.info("[Vencord] Installed React Developer Tools"))
                    .catch(err => console.error("[Vencord] Failed to install React Developer Tools", err));
        } catch { }


        // Remove CSP
        type PolicyResult = Record<string, string[]>;

        const parsePolicy = (policy: string): PolicyResult => {
            const result: PolicyResult = {};
            policy.split(";").forEach(directive => {
                const [directiveKey, ...directiveValue] = directive.trim().split(/\s+/g);
                if (directiveKey && !Object.prototype.hasOwnProperty.call(result, directiveKey)) {
                    result[directiveKey] = directiveValue;
                }
            });
            return result;
        };
        const stringifyPolicy = (policy: PolicyResult): string =>
            Object.entries(policy)
                .filter(([, values]) => values?.length)
                .map(directive => directive.flat().join(" "))
                .join("; ");

        function patchCsp(headers: Record<string, string[]>, header: string) {
            if (header in headers) {
                const csp = parsePolicy(headers[header][0]);

                for (const directive of ["style-src", "connect-src", "img-src", "font-src", "media-src", "worker-src"]) {
                    csp[directive] = ["*", "blob:", "data:", "'unsafe-inline'"];
                }
                // TODO: Restrict this to only imported packages with fixed version.
                // Perhaps auto generate with esbuild
                csp["script-src"] ??= [];
                csp["script-src"].push("'unsafe-eval'", "https://unpkg.com", "https://cdnjs.cloudflare.com");
                headers[header] = [stringifyPolicy(csp)];
            }
        }

        electron.session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, resourceType }, cb) => {
            if (responseHeaders) {
                if (resourceType === "mainFrame")
                    patchCsp(responseHeaders, "content-security-policy");

                // Fix hosts that don't properly set the css content type, such as
                // raw.githubusercontent.com
                if (resourceType === "stylesheet")
                    responseHeaders["content-type"] = ["text/css"];
            }
            cb({ cancel: false, responseHeaders });
        });
    });
} else {
    console.log("[Vencord] Running in vanilla mode. Not loading Vencord");
}

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
    require(require.main!.filename);
}

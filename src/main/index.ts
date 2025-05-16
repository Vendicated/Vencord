/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { app, protocol, session } from "electron";
import { join } from "path";

import { ensureSafePath } from "./ipcMain";
import { RendererSettings } from "./settings";
import { IS_VANILLA, THEMES_DIR } from "./utils/constants";
import { installExt } from "./utils/extensions";

if (IS_VESKTOP || !IS_VANILLA) {
    app.whenReady().then(() => {
        // Source Maps! Maybe there's a better way but since the renderer is executed
        // from a string I don't think any other form of sourcemaps would work
        protocol.registerFileProtocol("vencord", ({ url: unsafeUrl }, cb) => {
            let url = unsafeUrl.slice("vencord://".length);
            if (url.endsWith("/")) url = url.slice(0, -1);
            if (url.startsWith("/themes/")) {
                const theme = url.slice("/themes/".length);
                const safeUrl = ensureSafePath(THEMES_DIR, theme);
                if (!safeUrl) {
                    cb({ statusCode: 403 });
                    return;
                }
                cb(safeUrl.replace(/\?v=\d+$/, ""));
                return;
            }
            switch (url) {
                case "renderer.js.map":
                case "vencordDesktopRenderer.js.map":
                case "preload.js.map":
                case "vencordDesktopPreload.js.map":
                case "patcher.js.map":
                case "vencordDesktopMain.js.map":
                    cb(join(__dirname, url));
                    break;
                default:
                    cb({ statusCode: 403 });
            }
        });

        try {
            if (RendererSettings.store.enableReactDevtools)
                installExt("fmkadmapgofadopljbjfkapdkoienihi")
                    .then(() => console.info("[Vencord] Installed React Developer Tools"))
                    .catch(err => console.error("[Vencord] Failed to install React Developer Tools", err));
        } catch { }


        const findHeader = (headers: Record<string, string[]>, headerName: Lowercase<string>) => {
            return Object.keys(headers).find(h => h.toLowerCase() === headerName);
        };

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

        const patchCsp = (headers: Record<string, string[]>) => {
            const header = findHeader(headers, "content-security-policy");

            if (header) {
                const csp = parsePolicy(headers[header][0]);

                for (const directive of ["style-src", "connect-src", "img-src", "font-src", "media-src", "worker-src"]) {
                    csp[directive] ??= [];
                    csp[directive].push("*", "blob:", "data:", "vencord:", "'unsafe-inline'");
                }

                // TODO: Restrict this to only imported packages with fixed version.
                // Perhaps auto generate with esbuild
                csp["script-src"] ??= [];
                csp["script-src"].push("'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com");
                headers[header] = [stringifyPolicy(csp)];
            }
        };

        session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, resourceType }, cb) => {
            if (responseHeaders) {
                if (resourceType === "mainFrame")
                    patchCsp(responseHeaders);

                // Fix hosts that don't properly set the css content type, such as
                // raw.githubusercontent.com
                if (resourceType === "stylesheet") {
                    const header = findHeader(responseHeaders, "content-type");
                    if (header)
                        responseHeaders[header] = ["text/css"];
                }
            }

            cb({ cancel: false, responseHeaders });
        });

        // assign a noop to onHeadersReceived to prevent other mods from adding their own incompatible ones.
        // For instance, OpenAsar adds their own that doesn't fix content-type for stylesheets which makes it
        // impossible to load css from github raw despite our fix above
        session.defaultSession.webRequest.onHeadersReceived = () => { };
    });
}

if (IS_DISCORD_DESKTOP) {
    require("./patcher");
}

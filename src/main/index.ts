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

import { getSettings } from "./ipcMain";
import { IS_VANILLA } from "./utils/constants";
import { installExt } from "./utils/extensions";

if (IS_VENCORD_DESKTOP || !IS_VANILLA) {
    app.whenReady().then(() => {
        // Source Maps! Maybe there's a better way but since the renderer is executed
        // from a string I don't think any other form of sourcemaps would work
        protocol.registerFileProtocol("vencord", ({ url: unsafeUrl }, cb) => {
            let url = unsafeUrl.slice("vencord://".length);
            if (url.endsWith("/")) url = url.slice(0, -1);
            switch (url) {
                case "renderer.js.map":
                case "vencordDesktopRenderer.js.map":
                case "preload.js.map":
                case "patcher.js.map":
                case "vencordDesktopMain.js.map":
                    cb(join(__dirname, url));
                    break;
                default:
                    cb({ statusCode: 403 });
            }
        });

        try {
            if (getSettings().enableReactDevtools)
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

        session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, resourceType }, cb) => {
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

        // assign a noop to onHeadersReceived to prevent other mods from adding their own incompatible ones.
        // For instance, OpenAsar adds their own that doesn't fix content-type for stylesheets which makes it
        // impossible to load css from github raw despite our fix above
        session.defaultSession.webRequest.onHeadersReceived = () => { };
    });
}

if (IS_DISCORD_DESKTOP) {
    require("./patcher");
}

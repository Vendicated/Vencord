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

if (typeof browser === "undefined") {
    var browser = chrome;
}

browser.webRequest.onHeadersReceived.addListener(({ responseHeaders, url }) => {
    const cspIdx = responseHeaders.findIndex(h => h.name === "content-security-policy");
    if (cspIdx !== -1)
        responseHeaders.splice(cspIdx, 1);

    if (url.endsWith(".css")) {
        const contentType = responseHeaders.find(h => h.name === "content-type");
        if (contentType)
            contentType.value = "text/css";
        else
            responseHeaders.push({
                name: "content-type",
                value: "text/json"
            });
    }

    return {
        responseHeaders
    };
}, { urls: ["*://*.discord.com/*"] }, ["blocking", "responseHeaders"]);

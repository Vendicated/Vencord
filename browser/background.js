/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Linnea Gräf
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

function setContentTypeOnStylesheets(details) {
    if (details.type === "stylesheet") {
        details.responseHeaders.push({ name: "Content-Type", value: "text/css" });
    }
    return { responseHeaders: details.responseHeaders };
}

var cspHeaders = [
    "content-security-policy",
    "content-security-policy-report-only",
];

function removeCSPHeaders(details) {
    return { responseHeaders: details.responseHeaders.filter(header =>
        !cspHeaders.includes(header.name.toLowerCase())) };
}




browser.webRequest.onHeadersReceived.addListener(
    setContentTypeOnStylesheets, { urls: ["https://raw.githubusercontent.com/*"] }, ["blocking"]
);

browser.webRequest.onHeadersReceived.addListener(
    removeCSPHeaders, { urls: ["https://raw.githubusercontent.com/*", "*://*.discord.com/*"] }, ["blocking", "responseHeaders"]
);

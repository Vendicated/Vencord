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

function parseHeaders(headers) {
    if (!headers)
        return {};
    const result = {};
    const headersArr = headers.trim().split("\n");
    for (var i = 0; i < headersArr.length; i++) {
        var row = headersArr[i];
        var index = row.indexOf(":")
            , key = row.slice(0, index).trim().toLowerCase()
            , value = row.slice(index + 1).trim();

        if (result[key] === undefined) {
            result[key] = value;
        } else if (Array.isArray(result[key])) {
            result[key].push(value);
        } else {
            result[key] = [result[key], value];
        }
    }
    return result;
}

function blobTo(to, blob) {
    if (to === "arrayBuffer" && blob.arrayBuffer) return blob.arrayBuffer();
    return new Promise((resolve, reject) => {
        var fileReader = new FileReader();
        fileReader.onload = event => resolve(event.target.result);
        if (to === "arrayBuffer") fileReader.readAsArrayBuffer(blob);
        else if (to === "text") fileReader.readAsText(blob, "utf-8");
        else reject("unknown to");
    });
}

function GM_fetch(url, opt) {
    return new Promise((resolve, reject) => {
        // https://www.tampermonkey.net/documentation.php?ext=dhdg#GM_xmlhttpRequest
        const options = opt || {};
        options.url = url;
        options.data = options.body;
        options.responseType = "blob";
        options.onload = resp => {
            var blob = resp.response;
            resp.blob = () => Promise.resolve(blob);
            resp.arrayBuffer = () => blobTo("arrayBuffer", blob);
            resp.text = () => blobTo("text", blob);
            resp.json = async () => JSON.parse(await blobTo("text", blob));
            resp.headers = parseHeaders(resp.responseHeaders);
            resp.ok = resp.status >= 200 && resp.status < 300;
            resolve(resp);
        };
        options.ontimeout = () => reject("fetch timeout");
        options.onerror = () => reject("fetch error");
        options.onabort = () => reject("fetch abort");
        GM_xmlhttpRequest(options);
    });
}
export const fetch = GM_fetch;

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

import { IpcEvents } from "@utils/IpcEvents";
import { ipcMain } from "electron";
import { request } from "https";

// #region OpenInApp
// These links don't support CORS, so this has to be native
const validRedirectUrls = /^https:\/\/(spotify\.link|s\.team)\/.+$/;

function getRedirect(url: string) {
    return new Promise<string>((resolve, reject) => {
        const req = request(new URL(url), { method: "HEAD" }, res => {
            resolve(
                res.headers.location
                    ? getRedirect(res.headers.location)
                    : url
            );
        });
        req.on("error", reject);
        req.end();
    });
}

ipcMain.handle(IpcEvents.OPEN_IN_APP__RESOLVE_REDIRECT, async (_, url: string) => {
    if (!validRedirectUrls.test(url)) return url;

    return getRedirect(url);
});
// #endregion

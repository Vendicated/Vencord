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

import gitHash from "@git-hash";
import gitRemote from "@git-remote";
import { ipcMain } from "electron";
import { writeFile } from "fs/promises";
import { join } from "path";

import { VENCORD_USER_AGENT } from "../../utils/constants";
import IpcEvents from "../../utils/IpcEvents";
import { get } from "../simpleGet";
import { calculateHashes, serializeErrors } from "./common";

const API_BASE = `https://api.github.com/repos/${gitRemote}`;
let PendingUpdates = [] as [string, Buffer][];

async function githubGet(endpoint: string) {
    return get(API_BASE + endpoint, {
        headers: {
            Accept: "application/vnd.github+json",
            // "All API requests MUST include a valid User-Agent header.
            // Requests with no User-Agent header will be rejected."
            "User-Agent": VENCORD_USER_AGENT,
            // todo: perhaps add support for (optional) api token?
            // unauthorised rate limit is 60 reqs/h
            // https://github.com/settings/tokens/new?description=Vencord%20Updater
        }
    });
}

async function calculateGitChanges() {
    const res = await githubGet(`/compare/${gitHash}...HEAD`);

    const data = JSON.parse(res.toString("utf-8"));
    return data.commits.map(c => ({
        hash: c.sha,
        author: c.author.login,
        // github api only sends the long sha
        message: c.commit.message.slice(0, 7)
    }));
}

async function fetchUpdates() {
    const release = await githubGet("/releases/latest");

    const data = JSON.parse(release.toString());
    const hash = data.name.slice(data.name.lastIndexOf(" ") + 1);
    if (hash === gitHash)
        return true;

    await Promise.all(data.assets.map(async ({ name, browser_download_url }) => {
        if (["patcher.js", "preload.js", "renderer.js"].some(s => name.startsWith(s))) {
            PendingUpdates.push([name, await get(browser_download_url)]);
        }
    }));
    return true;
}

async function applyUpdates() {
    await Promise.all(PendingUpdates.map(([name, data]) => writeFile(join(__dirname, name), data)));
    PendingUpdates = [];
    return true;
}

ipcMain.handle(IpcEvents.GET_HASHES, serializeErrors(calculateHashes));
ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(() => `https://github.com/${gitRemote}`));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(fetchUpdates));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(applyUpdates));

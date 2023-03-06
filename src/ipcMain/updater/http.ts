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

import { VENCORD_USER_AGENT } from "@utils/constants";
import IpcEvents from "@utils/IpcEvents";
import { ipcMain } from "electron";
import { writeFile } from "fs/promises";
import { join } from "path";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { get } from "../simpleGet";
import { calculateHashes, serializeErrors } from "./common";

const API_BASE = `https://api.github.com/repos/${gitRemote}`;
let PendingUpdates = [] as [string, string][];

async function githubGet(endpoint: string) {
    return get(API_BASE + endpoint, {
        headers: {
            Accept: "application/vnd.github+json",
            // "All API requests MUST include a valid User-Agent header.
            // Requests with no User-Agent header will be rejected."
            "User-Agent": VENCORD_USER_AGENT
        }
    });
}

async function calculateGitChanges(branch: string) {
    const isOutdated = await fetchUpdates(branch);
    if (!isOutdated) return [];

    const res = await githubGet(`/compare/${gitHash}...${branch}`);

    const data = JSON.parse(res.toString("utf-8"));
    return data.commits.map((c: any) => ({
        // github api only sends the long sha
        hash: c.sha.slice(0, 7),
        author: c.author.login,
        message: c.commit.message
    }));
}

async function fetchUpdates(branch: string) {
    const release = await githubGet(`/releases/${branch === "latest-release" ? "latest" : `tags/${branch === "main" ? "devbuild" : branch}`}`);

    const data = JSON.parse(release.toString());
    const hash = data.name.slice(data.name.lastIndexOf(" ") + 1);
    if (hash === gitHash)
        return false;

    data.assets.forEach(({ name, browser_download_url }) => {
        if (["patcher.js", "preload.js", "renderer.js", "renderer.css"].some(s => name.startsWith(s))) {
            PendingUpdates.push([name, browser_download_url]);
        }
    });
    return true;
}

async function applyUpdates() {
    await Promise.all(PendingUpdates.map(
        async ([name, data]) => writeFile(join(__dirname, name), await get(data)))
    );
    PendingUpdates = [];
    return true;
}

async function getBranches() {
    const releases = await githubGet("/releases");

    const data = JSON.parse(releases.toString()).map(release => release.tag_name)
        .filter(release => release !== "devbuild") as Array<string>;
    data.unshift("latest-release", "main");

    return data;
}

async function switchBranch(newBranch: string) {
    const fetchRes = await fetchUpdates(newBranch);
    if (!fetchRes) return false;
    return applyUpdates();
}

ipcMain.handle(IpcEvents.GET_HASHES, serializeErrors(calculateHashes));
ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(() => `https://github.com/${gitRemote}`));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors((_, branch: string) => calculateGitChanges(branch)));
ipcMain.handle(IpcEvents.GET_BRANCHES, serializeErrors(getBranches));
ipcMain.handle(IpcEvents.SWITCH_BRANCH, serializeErrors((_, currentBranch: string, newBranch: string) => switchBranch(newBranch)));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors((_, branch: string) => fetchUpdates(branch)));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(applyUpdates));

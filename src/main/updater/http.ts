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

import { get } from "@main/utils/simpleGet";
import { IpcEvents } from "@shared/IpcEvents";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { app, dialog, ipcMain } from "electron";
import { writeFile } from "fs/promises";
import {
    existsSync,
    unlinkSync,
    writeFileSync,
} from "original-fs";
import { join } from "path";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { EQUICORD_FILES, serializeErrors } from "./common";

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

async function calculateGitChanges() {
    const isOutdated = await fetchUpdates();
    if (!isOutdated) return [];

    const res = await githubGet(`/compare/${gitHash}...HEAD`);

    const data = JSON.parse(res.toString("utf-8"));
    return data.commits.map((c: any) => ({
        // github api only sends the long sha
        hash: c.sha.slice(0, 7),
        author: c.author.login,
        message: c.commit.message.split("\n")[0]
    }));
}

async function fetchUpdates() {
    const release = await githubGet("/releases/latest");

    const data = JSON.parse(release.toString());
    const hash = data.name.slice(data.name.lastIndexOf(" ") + 1);
    if (hash === gitHash)
        return false;


    data.assets.forEach(({ name, browser_download_url }) => {
        if (EQUICORD_FILES.some(s => name.startsWith(s))) {
            PendingUpdates.push([name, browser_download_url]);
        }
    });

    return true;
}

async function applyUpdates() {
    await Promise.all(PendingUpdates.map(
        async ([name, data]) => writeFile(
            join(__dirname, name),
            await get(data)
        )
    ));
    PendingUpdates = [];

    return true;
}

async function migrateAsarToLegacy() {
    try {
        const isFlatpak = process.platform === "linux" && !!process.env.FLATPAK_ID;
        if (isFlatpak) throw "Flatpak Discord can't automatically be migrated.";

        const asarPath = join(__dirname, "../equicord.asar");
        if (existsSync(asarPath)) {
            unlinkSync(asarPath);
        }

        writeFileSync(__filename, "// Shim for legacy Equicord\n\nrequire(\"./index.js\");");

        app.relaunch();
        app.exit();
    } catch (e) {
        console.error("Failed to migrate to legacy", e);

        app.whenReady().then(() => {
            dialog.showErrorBox(
                "Migration Error",
                "Failed to migrate back to the legacy version. Please reinstall using the Equicord Installer."
            );
            app.exit(1);
        });
    }
}

ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(() => `https://github.com/${gitRemote}`));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(fetchUpdates));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(applyUpdates));

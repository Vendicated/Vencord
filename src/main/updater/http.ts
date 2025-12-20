/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { fetchBuffer, fetchJson } from "@main/utils/http";
import { IpcEvents } from "@shared/IpcEvents";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { ipcMain } from "electron";
import { writeFile } from "fs/promises";
import { join } from "path";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { serializeErrors, VENCORD_FILES } from "./common";

const API_BASE = `https://api.github.com/repos/${gitRemote}`;
let PendingUpdates = [] as [string, string][];

async function githubGet<T = any>(endpoint: string) {
    return fetchJson<T>(API_BASE + endpoint, {
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

    const data = await githubGet(`/compare/${gitHash}...HEAD`);

    return data.commits.map((c: any) => ({
        // github api only sends the long sha
        hash: c.sha.slice(0, 7),
        author: c.author.login,
        message: c.commit.message.split("\n")[0]
    }));
}

async function fetchUpdates() {
    const data = await githubGet("/releases/latest");

    const hash = data.name.slice(data.name.lastIndexOf(" ") + 1);
    if (hash === gitHash)
        return false;

    data.assets.forEach(({ name, browser_download_url }) => {
        if (VENCORD_FILES.some(s => name.startsWith(s))) {
            PendingUpdates.push([name, browser_download_url]);
        }
    });

    return true;
}

async function applyUpdates() {
    const fileContents = await Promise.all(PendingUpdates.map(async ([name, url]) => {
        const contents = await fetchBuffer(url);
        return [join(__dirname, name), contents] as const;
    }));

    await Promise.all(fileContents.map(async ([filename, contents]) =>
        writeFile(filename, contents))
    );

    PendingUpdates = [];
    return true;
}

ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(() => `https://github.com/${gitRemote}`));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(fetchUpdates));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(applyUpdates));

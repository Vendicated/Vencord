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

import { execFile as cpExecFile } from "child_process";
import { ipcMain } from "electron";
import { join } from "path";
import { promisify } from "util";

import IpcEvents from "../../utils/IpcEvents";
import { calculateHashes, serializeErrors } from "./common";

const VENCORD_SRC_DIR = join(__dirname, "..");

const execFile = promisify(cpExecFile);

function git(...args: string[]) {
    return execFile("git", args, {
        cwd: VENCORD_SRC_DIR
    });
}

async function getRepo() {
    const res = await git("remote", "get-url", "origin");
    return res.stdout.trim()
        .replace(/git@(.+):/, "https://$1/")
        .replace(/\.git$/, "");
}

async function calculateGitChanges() {
    await git("fetch");

    const res = await git("log", "HEAD...origin/main", "--pretty=format:%an/%h/%s");

    const commits = res.stdout.trim();
    return commits ? commits.split("\n").map(line => {
        const [author, hash, ...rest] = line.split("/");
        return {
            hash, author, message: rest.join("/")
        };
    }) : [];
}

async function pull() {
    const res = await git("pull");
    return res.stdout.includes("Fast-forward");
}

async function build() {
    const res = await execFile("node", ["scripts/build/build.mjs"], {
        cwd: VENCORD_SRC_DIR
    });
    return !res.stderr.includes("Build failed");
}

ipcMain.handle(IpcEvents.GET_HASHES, serializeErrors(calculateHashes));
ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(getRepo));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(pull));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(build));

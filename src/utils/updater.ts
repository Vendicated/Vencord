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

import gitHash from "~git-hash";

import IpcEvents from "./IpcEvents";
import Logger from "./Logger";
import { relaunch } from "./native";
import { IpcRes } from "./types";

export const UpdateLogger = /* #__PURE__*/ new Logger("Updater", "white");
export let isOutdated = false;
export let isNewer = false;
export let updateError: any;
export let changes: Record<"hash" | "author" | "message", string>[];

async function Unwrap<T>(p: Promise<IpcRes<T>>) {
    const res = await p;

    if (res.ok) return res.value;

    updateError = res.error;
    throw res.error;
}

export async function checkForUpdates() {
    changes = await Unwrap(VencordNative.ipc.invoke<IpcRes<typeof changes>>(IpcEvents.GET_UPDATES));
    if (changes.some(c => c.hash === gitHash)) {
        isNewer = true;
        return (isOutdated = false);
    }
    return (isOutdated = changes.length > 0);
}

export async function update() {
    if (!isOutdated) return true;

    const res = await Unwrap(VencordNative.ipc.invoke<IpcRes<boolean>>(IpcEvents.UPDATE));

    if (res)
        isOutdated = false;

    return res;
}

export function getRepo() {
    return Unwrap(VencordNative.ipc.invoke<IpcRes<string>>(IpcEvents.GET_REPO));
}

export async function rebuild() {
    if (!await Unwrap(VencordNative.ipc.invoke<IpcRes<boolean>>(IpcEvents.BUILD)))
        throw new Error("The Build failed. Please try manually building the new update");
}

export async function maybePromptToUpdate(confirmMessage: string, checkForDev = false) {
    if (IS_WEB) return;
    if (checkForDev && IS_DEV) return;

    try {
        const isOutdated = await checkForUpdates();
        if (isOutdated) {
            const wantsUpdate = confirm(confirmMessage);
            if (wantsUpdate && isNewer) return alert("Your local copy has more recent commits. Please stash or reset them.");
            if (wantsUpdate) {
                await update();
                await rebuild();
                relaunch();
            }
        }
    } catch (err) {
        UpdateLogger.error(err);
        alert("That also failed :( Try updating or re-installing with the installer!");
    }
}

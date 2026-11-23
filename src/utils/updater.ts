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

import { Logger } from "./Logger";
import { relaunch } from "./native";
import { IpcRes } from "./types";

export const UpdateLogger = /* #__PURE__*/ new Logger("Updater", "white");
export let isOutdated = false;
export let isNewer = false;
export let updateError: any;
export let changes: Record<"hash" | "author" | "message", string>[];

let updateCheck: Promise<boolean> | undefined;
let updateInProgress: Promise<boolean> | undefined;
let gitBuildPending = false;

async function Unwrap<T>(p: Promise<IpcRes<T>>) {
    const res = await p;

    if (res.ok) return res.value;

    updateError = res.error;
    throw res.error;
}

export function checkForUpdates() {
    if (gitBuildPending) return Promise.resolve(true);

    return updateCheck ??= fetchUpdates().finally(() => {
        updateCheck = undefined;
    });
}

async function fetchUpdates() {
    const fetchedChanges = await Unwrap(VencordNative.updater.getUpdates());
    if (gitBuildPending) return true;
    changes = fetchedChanges;

    // we only want to check this for the git updater, not the http updater
    if (!IS_STANDALONE) {
        if (changes.some(c => c.hash === gitHash)) {
            isNewer = true;
            return (isOutdated = false);
        }
    }

    return (isOutdated = changes.length > 0);
}

export function update() {
    if (updateInProgress) return updateInProgress;
    if (!isOutdated && !gitBuildPending) return Promise.resolve(true);

    return updateInProgress = applyUpdate().finally(() => {
        updateInProgress = undefined;
    });
}

async function applyUpdate() {
    if (!gitBuildPending && !await Unwrap(VencordNative.updater.update())) return false;

    // A successful git pull advances HEAD even if the build fails.
    gitBuildPending = !IS_STANDALONE;
    if (!await Unwrap(VencordNative.updater.rebuild()))
        throw new Error("The Build failed. Please try manually building the new update");

    gitBuildPending = false;
    isOutdated = false;
    return true;
}

export const getRepo = () => Unwrap(VencordNative.updater.getRepo());

export async function maybePromptToUpdate(confirmMessage: string, checkForDev = false) {
    if (IS_WEB || IS_UPDATER_DISABLED) return;
    if (checkForDev && IS_DEV) return;

    try {
        const outdated = !updateInProgress && await checkForUpdates();
        if (updateInProgress) {
            if (await updateInProgress && confirm("Vencord has been updated. Would you like to restart Discord now?")) {
                relaunch();
            }
            return;
        }

        if (outdated) {
            const wantsUpdate = confirm(confirmMessage);
            if (wantsUpdate && isNewer) return alert("Your local copy has more recent commits. Please stash or reset them.");
            if (wantsUpdate) {
                if (await update()) relaunch();
            }
        }
    } catch (err) {
        UpdateLogger.error(err);
        alert("That also failed :( Try updating or re-installing with the installer!");
    }
}

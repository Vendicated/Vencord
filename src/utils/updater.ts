/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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

async function Unwrap<T>(p: Promise<IpcRes<T>>) {
    const res = await p;

    if (res.ok) return res.value;

    updateError = res.error;
    throw res.error;
}

export async function checkForUpdates() {
    changes = await Unwrap(VencordNative.updater.getUpdates());
    if (changes.some(c => c.hash === gitHash)) {
        isNewer = true;
        return (isOutdated = false);
    }
    return (isOutdated = changes.length > 0);
}

export async function update() {
    if (!isOutdated) return true;

    const res = await Unwrap(VencordNative.updater.update());

    if (res) {
        isOutdated = false;
        if (!await Unwrap(VencordNative.updater.rebuild()))
            throw new Error("The Build failed. Please try manually building the new update");
    }

    return res;
}

export const getRepo = () => Unwrap(VencordNative.updater.getRepo());

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
                relaunch();
            }
        }
    } catch (err) {
        UpdateLogger.error(err);
        alert("That also failed :( Try updating or re-installing with the installer!");
    }
}

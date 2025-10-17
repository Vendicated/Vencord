/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

import ActiveWindow, { WindowInfo } from "./vendor/node-active-window/src";

let isInit: boolean = false;

export async function initActiveWindow(_e: IpcMainInvokeEvent): Promise<boolean> {
    ActiveWindow.initialize();

    // On MacOS you need to check for the screen recording permission (using requestPermissions), otherwise you won't be able to fetch the window titles.
    // https://github.com/paymoapp/node-active-window?tab=readme-ov-file#usage`
    if (process.platform === "darwin" && !ActiveWindow.requestPermissions()) {
        console.log(
            "Error: You need to grant screen recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording"
        );
    } else {
        isInit = true;
    }

    return isInit;
}

export async function getActiveWindow(_e: IpcMainInvokeEvent): Promise<WindowInfo | undefined> {
    if (isInit) {
        return ActiveWindow.getActiveWindow();
    }
}

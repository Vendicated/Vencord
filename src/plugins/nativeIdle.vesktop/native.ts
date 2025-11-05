/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent, powerMonitor } from "electron";

let suspended = false;
let locked = false;

export function init(e: IpcMainInvokeEvent) {
    function handlePowerEvent(idle: boolean) {
        e.sender.executeJavaScript(`Vencord.Plugins.plugins.NativeIdle.handlePowerEvent(${idle})`);
    }

    powerMonitor.on("suspend", () => {
        handlePowerEvent(suspended = true);
    });

    powerMonitor.on("resume", () => {
        handlePowerEvent(suspended = false);
    });

    powerMonitor.on("lock-screen", () => {
        handlePowerEvent(locked = true);
    });

    powerMonitor.on("unlock-screen", () => {
        handlePowerEvent(locked = false);
    });
}

export function suspendedOrLocked() {
    return suspended || locked;
}

export function getSystemIdleTimeMs() {
    return powerMonitor.getSystemIdleTime() * 1000;
}

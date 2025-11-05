/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { powerMonitor } from "electron";

let suspended = false;
let locked = false;

export function init() {
    powerMonitor.on("suspend", () => {
        suspended = true;
    });

    powerMonitor.on("resume", () => {
        suspended = false;
    });

    powerMonitor.on("lock-screen", () => {
        locked = true;
    });

    powerMonitor.on("unlock-screen", () => {
        locked = false;
    });
}

export function isSuspended() {
    return suspended;
}

export function isLocked() {
    return locked;
}

export function getSystemIdleTimeMs() {
    return powerMonitor.getSystemIdleTime() * 1000;
}

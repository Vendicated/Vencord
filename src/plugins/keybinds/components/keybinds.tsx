/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { relaunch } from "@utils/native";

export const keybinds: { [key: string]: any; } = {
    debuggerPause: {
        name: "Debugger Pause",
        desc: "Pauses the client in using the debugger",
        default: {
            enabled: false,
            key: "F8",
            ctrl: false,
            alt: false,
            shift: false,
        },
        action: () => {
            // Hi! You've just paused the client. Pressing F8 in DevTools or in the main window will unpause it again.
            // It's up to you on what to do, friend. Happy travels!
            debugger;
        },
    },
    inboxJump: {
        name: "Inbox Jump",
        desc: "Adds a keybind for the jump button in the inbox",
        default: {
            enabled: false,
            key: ";",
            ctrl: true,
            alt: false,
            shift: false
        },
        action: () => {
            const btn = document.querySelector(
                "div[class^=jumpButton]",
            );
            if (btn) btn?.click();
            console.log("Executed");
        }
    },
    restart: {
        name: "Restart",
        desc: "Restarts your discord client",
        default: {
            enabled: false,
            key: "R",
            ctrl: true,
            shift: true,
            alt: false,
        },
        action: () => {
            relaunch();
        }
    }
};

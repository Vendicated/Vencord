/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcEvents } from "@shared/IpcEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "xdgGlobalKeybinds",
    description:
        "Adds support for global shortcuts for linux using xdg-desktop-portal. This is espically useful for Vesktop users who want to use global keybinds and/or Hyprland users.",
    authors: [Devs.khald0r],

    start() {
        // Map shortcut_id to functions
        const shortcutActions = new Map<string, () => void>([
            ["toggle_mute", toggleMute],
            ["toggle_deafen", toggleDeafen],
        ]);

        VencordNative.ipcRenderer.on(
            IpcEvents.XDG_GLOBAL_KEYBIND_ACTIVATED,
            (_, shortcut_id) => {
                const action = shortcutActions.get(shortcut_id);
                if (action) {
                    action();
                } else {
                    console.warn(
                        `No action defined for shortcut: ${shortcut_id}`,
                    );
                }
            },
        );
    },

    stop() {
        VencordNative.ipcRenderer.removeAllListeners(
            IpcEvents.XDG_GLOBAL_KEYBIND_ACTIVATED,
        );
    },
});

// TODO: instead of triggering clicks, find the actual functions to call
// This would enable more actions in the future, like toggling push-to-talk
function toggleMute() {
    const muteButton = document.querySelector(
        'button[aria-label="Mute"][role="switch"]',
    ) as HTMLButtonElement | null;
    muteButton?.click();
}

function toggleDeafen() {
    const deafenButton = document.querySelector(
        'button[aria-label="Deafen"][role="switch"]',
    ) as HTMLButtonElement | null;
    deafenButton?.click();
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { settings } from "./settings";
import { startStreaming, stopStreaming, toggleAudio, toggleGameOrScreen, toggleStream } from "./streamManager";

export default definePlugin({
    name: "ShortcutScreenShare",
    description: "Screenshare screen from keyboard shortcut when no game is running.",
    authors: [Devs.nicola02nb],
    settings,
    keybinds: [
        { event: "testKeybind", global: false, function: () => console.log("Test keybind pressed!"), options: { keydown: true, keyup: false } },
        { event: "startStreaming", global: true, function: startStreaming, options: { blurred: false, focused: false, keydown: true, keyup: false } },
        { event: "stopStreaming", global: true, function: stopStreaming, options: { blurred: false, focused: false, keydown: true, keyup: false } },
        { event: "toggleAudio", global: true, function: toggleAudio, options: { blurred: false, focused: false, keydown: true, keyup: false } },
        { event: "toggleStream", global: true, function: toggleStream, options: { blurred: false, focused: false, keydown: true, keyup: false } },
        { event: "toggleGameOrScreen", global: true, function: toggleGameOrScreen, options: { blurred: false, focused: true, keydown: true, keyup: false } }
    ],
    start: () => {
    },
    stop: () => {
    }
});

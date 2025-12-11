/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { updateStream } from "./streamManager";


export type ShikiSettings = typeof settings.store;
export const settings = definePluginSettings({
    testKeybind: {
        type: OptionType.KEYBIND,
        description: "Set the shortcut to test the keybind.",
        global: false,
        onChange: keys => console.log(
            "Test keybind changed to:", keys
        )
    },
    displayNumber: {
        type: OptionType.NUMBER,
        description: "Default themes",
        default: 1
    },
    toggleStream: {
        type: OptionType.KEYBIND,
        description: "Set the shortcut to toggle the stream.",
        global: true
    },
    toggleGameOrScreen: {
        type: OptionType.KEYBIND,
        description: "Set the shortcut to toggle the game or screen.",
        global: true
    },
    toggleAudio: {
        type: OptionType.KEYBIND,
        description: "Set the shortcut to toggle the audio.",
        global: true
    },
    startStreaming: {
        type: OptionType.KEYBIND,
        description: "Set the shortcut to start the stream.",
        global: true
    },
    stopStreaming: {
        type: OptionType.KEYBIND,
        description: "Set the shortcut to stop the stream.",
        global: true
    },
    disablePreview: {
        type: OptionType.BOOLEAN,
        description: "If enabled, the preview will be disabled.",
        default: false,
        onChange: updateStream
    },
    shareAudio: {
        type: OptionType.BOOLEAN,
        description: "If enabled, audio will be shared.",
        default: true,
        onChange: updateStream
    },
    shareAlwaysScreen: {
        type: OptionType.BOOLEAN,
        description: "If enabled, the screen will always be shared.",
        default: true
    },
    showToast: {
        type: OptionType.BOOLEAN,
        description: "If enabled, toasts will be shown when the stream is started or stopped.",
        default: true
    }
});

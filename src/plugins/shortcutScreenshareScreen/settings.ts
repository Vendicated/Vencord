/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import * as keybindsManager from "@api/Keybinds/keybindsManager";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { updateStream } from "./streamManager";


export type ShikiSettings = typeof settings.store;
export const settings = definePluginSettings({
    testKeybind: {
        type: OptionType.KEYBIND,
        description: "Set the shortcut to test the keybind.",
        clearable: true,
        global: false,
        onChange: value => {
            keybindsManager.updateKeybind("testKeybind", value, false);
        }
    },
    displayNumber: {
        type: OptionType.NUMBER,
        description: "Default themes",
        default: 1
    },
    toggleStream: {
        type: OptionType.KEYBIND,
        description: "Set the shortcut to toggle the stream.",
        clearable: true,
        global: true,
        onChange: value => {
            keybindsManager.updateKeybind("toggleStream", value, true);
        }
    },
    toggleGameOrScreen: {
        type: OptionType.KEYBIND,
        description: "Set the shortcut to toggle the game or screen.",
        clearable: true,
        global: true,
        onChange: value => {
            keybindsManager.updateKeybind("toggleGameOrScreen", value, true);
        }
    },
    toggleAudio: {
        type: OptionType.KEYBIND,
        description: "Set the shortcut to toggle the audio.",
        clearable: true,
        global: true,
        onChange: value => {
            keybindsManager.updateKeybind("toggleAudio", value, true);
        }
    },
    startStreaming: {
        type: OptionType.KEYBIND,
        description: "Set the shortcut to start the stream.",
        clearable: true,
        global: true,
        onChange: value => {
            keybindsManager.updateKeybind("startStreaming", value, true);
        }
    },
    stopStreaming: {
        type: OptionType.KEYBIND,
        description: "Set the shortcut to stop the stream.",
        clearable: true,
        global: true,
        onChange: value => {
            keybindsManager.updateKeybind("stopStreaming", value, true);
        }
    },
    disablePreview: {
        type: OptionType.BOOLEAN,
        description: "If enabled, the preview will be disabled.",
        default: false,
        onChange: (value: boolean) => {
            settings.store.disablePreview = value;
            updateStream();
        }
    },
    shareAudio: {
        type: OptionType.BOOLEAN,
        description: "If enabled, audio will be shared.",
        default: true,
        onChange: (value: boolean) => {
            settings.store.shareAudio = value;
            updateStream();
        }
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

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { makeRange, OptionType } from "@utils/types";

import { sounds } from ".";
import { croissant } from "./equissant";

export const settings = definePluginSettings({
    equissant: {
        type: OptionType.BOOLEAN,
        description: "Crossant every 10 clicks :trolley:",
        default: false,
        onChange: v => {
            if (v) {
                document.addEventListener("click", croissant);
            } else {
                document.removeEventListener("click", croissant);
            }
        }
    },
    moyai: {
        type: OptionType.BOOLEAN,
        description: "🗿🗿🗿🗿🗿🗿🗿🗿",
        default: false,
    },
    animalese: {
        type: OptionType.BOOLEAN,
        description: "Plays animal crossing animalese for every message sent (they yap a lot)",
        default: false,
    },
    keyboardSounds: {
        type: OptionType.BOOLEAN,
        description: "Adds the Opera GX Keyboard Sounds to Discord",
        default: false,
    },
    speed: {
        type: OptionType.SLIDER,
        description: "Speed of the animalese sound",
        default: 1,
        markers: [0.5, 0.75, 1, 1.25, 1.5],
    },
    pitch: {
        type: OptionType.SLIDER,
        description: "Pitch multiplier",
        default: 1,
        markers: [0.75, 0.8, 0.85, 1, 1.15, 1.25, 1.35, 1.5],
    },
    volume: {
        description: "Volume of the 🗿🗿🗿",
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        default: 0.5,
        stickToMarkers: false,
        onChange: value => { for (const sound of Object.values(sounds)) sound.volume = value / 100; }

    },
    soundQuality: {
        type: OptionType.SELECT,
        description: "Quality of sound to use",
        options: [
            {
                label: "High",
                value: "high",
                default: true
            },
            {
                label: "Medium",
                value: "med"
            },
            {
                label: "Low",
                value: "low"
            },
            {
                label: "Lowest",
                value: "low"
            }
        ]
    },
    triggerWhenUnfocused: {
        description: "Trigger the 🗿 even when the window is unfocused",
        type: OptionType.BOOLEAN,
        default: true
    },
    ignoreBots: {
        description: "Ignore bots",
        type: OptionType.BOOLEAN,
        default: true
    },
    ignoreBlocked: {
        description: "Ignore blocked users",
        type: OptionType.BOOLEAN,
        default: true
    },
    messageLengthLimit: {
        type: OptionType.NUMBER,
        description: "Maximum length of message to process",
        default: 50,
    },
    processOwnMessages: {
        type: OptionType.BOOLEAN,
        description: "Enable to yap your own messages too",
        default: true,
    },
});

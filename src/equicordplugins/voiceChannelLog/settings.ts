/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

const settings = definePluginSettings({
    logJoinLeave: {
        type: OptionType.BOOLEAN,
        description: "Log when users join, leave, or move between voice channels.",
        default: true
    },
    logSoundboard: {
        type: OptionType.BOOLEAN,
        description: "Log when users play soundboard sounds.",
        default: true
    },
    logMuteDeafen: {
        type: OptionType.BOOLEAN,
        description: "Log when users are server muted or deafened.",
        default: true
    },
    logVideo: {
        type: OptionType.BOOLEAN,
        description: "Log when users turn their camera on or off.",
        default: true
    },
    logStream: {
        type: OptionType.BOOLEAN,
        description: "Log when users start or stop screensharing.",
        default: true
    },
    logActivity: {
        type: OptionType.BOOLEAN,
        description: "Log when users start embedded activities.",
        default: true
    },
    ignoreBlockedUsers: {
        type: OptionType.BOOLEAN,
        description: "Do not log blocked users.",
        default: false
    },
    soundboardFileType: {
        type: OptionType.SELECT,
        description: "File format for downloading soundboard sounds.",
        options: [
            { label: ".ogg", value: ".ogg", default: true },
            { label: ".mp3", value: ".mp3" },
            { label: ".wav", value: ".wav" },
        ],
    },
    soundboardVolume: {
        type: OptionType.SLIDER,
        description: "Preview volume for soundboard sounds (0 to disable).",
        default: 0.5,
        markers: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
    },
});

export default settings;

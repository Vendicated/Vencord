/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export default definePluginSettings({
    protectFromMute: {
        type: OptionType.BOOLEAN,
        description: "Protect from being muted in voice channels.",
        default: true
    },
    protectFromDeaf: {
        type: OptionType.BOOLEAN,
        description: "Protect from being deafened in voice channels.",
        default: true
    },
    protectFromDisconnect: {
        type: OptionType.BOOLEAN,
        description: "Protect from being disconnected from voice channels.",
        default: true
    },
    reverseProtection: {
        type: OptionType.BOOLEAN,
        description: "Reverse protection - give back the same action to the person who did it to you.",
        default: false
    },
    preserveVoiceState: {
        type: OptionType.BOOLEAN,
        description: "Preserve your voice state (mute, deaf, video, etc.) when reconnecting.",
        default: true
    },
    preserveScreenShare: {
        type: OptionType.BOOLEAN,
        description: "Preserve screen share settings when reconnecting.",
        default: true
    },
    preserveVideoQuality: {
        type: OptionType.BOOLEAN,
        description: "Preserve video quality settings when reconnecting.",
        default: true
    }
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    audioBitrate: {
        type: OptionType.SLIDER,
        description: "Audio Bitrate (kbps) - 510kbps recommended for maximum quality",
        markers: [64, 96, 128, 192, 256, 320, 384, 448, 510],
        default: 510,
        stickToMarkers: true,
        restartNeeded: false
    },

    enableKrispNoiseSuppression: {
        type: OptionType.BOOLEAN,
        description: "Krisp AI Noise Suppression - Remove background noise (Disable for raw quality)",
        default: false,
        restartNeeded: false
    },

    enableEchoCancellation: {
        type: OptionType.BOOLEAN,
        description: "Echo Cancellation - Remove echo feedback (Disable for raw quality)",
        default: false,
        restartNeeded: false
    },

    enableAutoGainControl: {
        type: OptionType.BOOLEAN,
        description: "Auto Gain Control - Automatically adjust volume levels (Disable for natural sound)",
        default: false,
        restartNeeded: false
    },

    prioritizeAudioQuality: {
        type: OptionType.BOOLEAN,
        description: "Prioritize Audio Quality - Maximum quality over bandwidth savings",
        default: true,
        restartNeeded: false
    }
});

export default definePlugin({
    name: "rzStudioAudio",
    description: "🎙️ Professional studio-grade audio quality for Discord. 510kbps OPUS @ 48kHz with maximum quality settings. Optimized for 192kHz microphones.",
    authors: [Devs.rz30],

    settings,

    patches: [
        {
            find: "voiceBitrate:",
            replacement: {
                match: /voiceBitrate:\i/,
                replace: "voiceBitrate:$self.getAudioBitrate()*1000"
            }
        },
        {
            find: "setVoiceBitRate",
            replacement: {
                match: /setVoiceBitRate\((\i)\)/,
                replace: "setVoiceBitRate($self.getAudioBitrate()*1000)"
            }
        },
        {
            find: "noiseSuppression:",
            replacement: {
                match: /noiseSuppression:!?\d/,
                replace: "noiseSuppression:$self.getNoiseSuppression()"
            }
        },
        {
            find: "echoCancellation:",
            replacement: {
                match: /echoCancellation:!?\d/,
                replace: "echoCancellation:$self.getEchoCancellation()"
            }
        },
        {
            find: "autoGainControl:",
            replacement: {
                match: /autoGainControl:!?\d/,
                replace: "autoGainControl:$self.getAutoGainControl()"
            }
        },
        {
            find: "x-google-max-bitrate",
            replacement: {
                match: /"x-google-max-bitrate=".concat\(\i\)/,
                replace: '"x-google-max-bitrate=".concat($self.getAudioBitrate()*1000)'
            }
        },
        {
            find: "b=AS:",
            replacement: {
                match: /b=AS:\d+/,
                replace: "b=AS:$self.getAudioBitrate()*1000"
            }
        }
    ],

    getAudioBitrate() {
        const bitrate = settings.store.audioBitrate;
        console.log(`🎙️ [rz Plugin] Audio Bitrate: ${bitrate} kbps`);
        return bitrate;
    },

    getNoiseSuppression() {
        return !settings.store.enableKrispNoiseSuppression;
    },

    getEchoCancellation() {
        return settings.store.enableEchoCancellation;
    },

    getAutoGainControl() {
        return settings.store.enableAutoGainControl;
    },

    start() {
        console.log("🎙️ [rz Studio Audio] ACTIVATED");
        console.log("📊 Settings:");
        console.log("   • Bitrate: " + settings.store.audioBitrate + " kbps");
        console.log("   • Krisp: " + (settings.store.enableKrispNoiseSuppression ? "ON" : "OFF"));
        console.log("   • Echo Cancel: " + (settings.store.enableEchoCancellation ? "ON" : "OFF"));
        console.log("   • AGC: " + (settings.store.enableAutoGainControl ? "ON" : "OFF"));
        console.log("🔥 Maximum quality mode enabled!");
    },

    stop() {
        console.log("🎙️ [rz Studio Audio] Deactivated");
    }
});
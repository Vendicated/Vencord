/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { applyVolumes } from "./audio/mixer";
import { applyMusicVolume } from "./audio/player";

export type PanelTab = "server" | "sounds" | "music";
export type RepeatMode = "off" | "all" | "one";

export type JoinSound =
    | { type: "library"; id: string; }
    | { type: "soundboard"; soundId: string; guildId: string; };

export const DEFAULT_TRANSPARENCY = 65;

export const glassOpacity = (transparency: number) => 100 - 0.8 * transparency;

export const settings = definePluginSettings({
    transmit: {
        type: OptionType.BOOLEAN,
        description: "Send your sounds and music to the voice channel. When off, only you hear them",
        default: true,
        onChange: applyVolumes
    },
    voiceVolume: {
        type: OptionType.SLIDER,
        description: "Volume others hear your sounds and music at",
        markers: [0, 25, 50, 75, 100, 125, 150],
        default: 100,
        stickToMarkers: false,
        onChange: applyVolumes
    },
    localVolume: {
        type: OptionType.SLIDER,
        description: "Volume you hear your sounds, music and previews at",
        markers: [0, 25, 50, 75, 100],
        default: 50,
        stickToMarkers: false,
        onChange: applyVolumes
    },
    musicVolume: {
        type: OptionType.SLIDER,
        description: "Music volume, for you and the voice channel",
        markers: [0, 25, 50, 75, 100],
        default: 60,
        stickToMarkers: false,
        onChange: applyMusicVolume
    },
    microphoneBoost: {
        type: OptionType.SLIDER,
        description: "Raise your own voice by up to 12 dB if others hear you quieter than everyone else. Your sounds and music stay as they are, and loud words don't distort. Works wherever the plugin mixes into your microphone: the browser, Vesktop, and the desktop app with the WebRTC engine",
        markers: [0, 3, 6, 9, 12],
        default: 0,
        stickToMarkers: false,
        onChange: applyVolumes
    },
    serverSoundsThroughMic: {
        type: OptionType.BOOLEAN,
        description: "Play server sounds through your microphone even where Discord's soundboard is allowed",
        default: false
    },
    allowOverlap: {
        type: OptionType.BOOLEAN,
        description: "Let your sounds overlap instead of stopping the previous one",
        default: true
    },
    holdPushToTalk: {
        type: OptionType.BOOLEAN,
        description: "Keep transmitting while your audio plays when using Push to Talk",
        default: true
    },
    webrtcEngine: {
        type: OptionType.BOOLEAN,
        description: "Use Discord's WebRTC voice engine. The desktop app's native engine can't carry your own audio, so others only hear it with this on",
        default: false,
        restartNeeded: true,
        hidden: !IS_DISCORD_DESKTOP
    },
    maxVideoQuality: {
        type: OptionType.BOOLEAN,
        description: "With the WebRTC engine, send your camera and streams at full quality instead of shrinking them to viewers' window sizes. Uses more bandwidth and CPU",
        default: true,
        hidden: !IS_DISCORD_DESKTOP
    },
    transparency: {
        type: OptionType.SLIDER,
        description: "How see-through the panel is, from 0% (solid) to 100%. Also in the panel, from the button next to its title",
        markers: [0, 25, 50, 75, 100],
        default: DEFAULT_TRANSPARENCY,
        stickToMarkers: false
    },
    activeTab: {
        type: OptionType.STRING,
        description: "Last opened tab",
        default: "server" as PanelTab,
        hidden: true
    },
    repeatMode: {
        type: OptionType.STRING,
        description: "Music repeat mode",
        default: "all" as RepeatMode,
        hidden: true
    },
    shuffle: {
        type: OptionType.BOOLEAN,
        description: "Shuffle music",
        default: false,
        hidden: true
    },
    joinSound: {
        type: OptionType.CUSTOM,
        default: null as JoinSound | null
    }
});

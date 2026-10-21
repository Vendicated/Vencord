/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findLazy } from "@webpack";

export const SOUND_KEYS = [
    "discodo", "message1", "deafen", "undeafen", "mute", "unmute", "disconnect",
    "ptt_start", "ptt_stop", "user_join", "user_leave", "user_moved",
    "call_calling", "call_ringing", "stream_started", "stream_ended",
    "stream_user_joined", "stream_user_left", "poggermode_enabled",
    "poggermode_applause", "poggermode_achievement_unlock", "stage_waiting",
    "camera_off", "camera_on"
] as const;

export type SoundKey = typeof SOUND_KEYS[number];
export type Overrides = Partial<Record<SoundKey, string>>;

// Module with all audiofiles in a map
const soundContext = findLazy(m =>
    typeof m === "function" &&
    typeof m.keys === "function" &&
    typeof m.resolve === "function" &&
    Array.isArray(m.keys()) &&
    m.keys().includes("./discodo.mp3")
);

// "./mute.mp3" -> "mute"
export function getAudioNames(): string[] {
    return soundContext
        .keys()
        .map((k: string) => k.replace(/^\.\//, "").replace(/\.mp3$/, ""));
}

export function getAudioOptions() {
    return getAudioNames().map(name => ({
        label: name.replace(/_/g, " "),
        value: name
    }));
}

// get specific event audio options
export function eventPreset(prefix: "halloween" | "winter"): Overrides {
    const names = getAudioNames();
    const preset: Overrides = {};
    for (const key of SOUND_KEYS) {
        const name = `${prefix}_${key}`;
        if (names.includes(name)) preset[key] = name;
    }
    return preset;
}

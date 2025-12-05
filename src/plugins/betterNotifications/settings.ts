/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export interface SoundEntry {
    id: string;
    type: "user" | "guild";
    userId: string;
    displayName?: string;
    userLabel?: string;
    guildId: string;
    guildName?: string;
    soundUrl: string;
    filename?: string;
    volume: number;
}

export const settings = definePluginSettings({
    soundEntries: {
        type: OptionType.STRING,
        description: "Sound entries configuration (JSON format)",
        default: "[]",
        hidden: true
    }
});

export function getSoundEntries(): SoundEntry[] {
    try {
        const value = settings.store.soundEntries;
        if (typeof value === "string") {
            return JSON.parse(value);
        }
        return [];
    } catch {
        return [];
    }
}

export function saveSoundEntries(entries: SoundEntry[]): void {
    settings.store.soundEntries = JSON.stringify(entries);
}

export function buildSoundMap(entries: SoundEntry[]): {
    userSounds: Record<string, { soundUrl: string; volume: number; }>;
    displayNameSounds: Record<string, { soundUrl: string; volume: number; }>;
    guildSounds: Record<string, { soundUrl: string; volume: number; }>;
} {
    const userSounds: Record<string, { soundUrl: string; volume: number; }> = {};
    const displayNameSounds: Record<string, { soundUrl: string; volume: number; }> = {};
    const guildSounds: Record<string, { soundUrl: string; volume: number; }> = {};

    entries.forEach(entry => {
        if (entry.type === "user") {
            if (entry.userId) {
                userSounds[entry.userId] = { soundUrl: entry.soundUrl, volume: entry.volume };
            }
            if (entry.displayName) {
                displayNameSounds[entry.displayName] = { soundUrl: entry.soundUrl, volume: entry.volume };
            }
        } else if (entry.type === "guild" && entry.guildId) {
            guildSounds[entry.guildId] = { soundUrl: entry.soundUrl, volume: entry.volume };
        }
    });
    return { userSounds, displayNameSounds, guildSounds };
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { findByCodeLazy, findLazy } from "@webpack";

const AudioPlayerConstructor = findByCodeLazy("sound has no duration");
const findDefaultSounds = findLazy(module => module.resolve && module.id && module.keys().some(key => key.endsWith(".mp3")), false);

let defaultSounds: string[] | null = null;

export function AudioPlayer(name: string, volume: number = 1, callback?: () => void): any {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (Settings.plugins.AudioPlayerAPI?.enabled) {
        return new AudioPlayerConstructor(name, null, clampedVolume, "default", {
            onEnded: callback,
            volume: clampedVolume * 100,
        });
    }

    return new AudioPlayerConstructor(name, null, clampedVolume, "default", callback);
}

export function getDefaultSounds(): string[] {
    defaultSounds ??= (findDefaultSounds.keys() || []).map(key => {
        const match = key.match(/((?:\w|-)+)\.mp3$/);

        return match ? match[1] : null;
    }).filter(Boolean) as string[];

    return defaultSounds;
}

export function formatSoundName(sound: string): string {
    return sound
        .toUpperCase()
        .replace(/_/g, " ")
        .replace(/(\d+)/g, " $1");
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { playAudio } from "@api/AudioPlayer";
import { classNameFactory } from "@utils/css";
import { saveFile } from "@utils/web";
import { findByPropsLazy } from "@webpack";

import settings from "./settings";
import { Emoji } from "./types";

export const cl = classNameFactory("vc-voice-channel-log-");

const EmojiManager = findByPropsLazy("getEmojiColors", "getURL");

export function getEmojiUrl(emoji?: Emoji): string {
    if (!emoji) return EmojiManager.getURL("❓");
    return emoji.id ? `https://cdn.discordapp.com/emojis/${emoji.id}.png?size=32` : EmojiManager.getURL(emoji.name);
}

export const playSound = (id: string) => {
    playAudio(`https://cdn.discordapp.com/soundboard-sounds/${id}`, { volume: settings.store.soundboardVolume * 100 });
};

export async function downloadSound(id: string): Promise<void> {
    const filename = id + settings.store.soundboardFileType;
    const original = await fetch(`https://cdn.discordapp.com/soundboard-sounds/${id}`).then(res => res.arrayBuffer());

    if (IS_DISCORD_DESKTOP) {
        DiscordNative.fileManager.saveWithDialog(new Uint8Array(original), filename);
    } else {
        saveFile(new File([original], filename, { type: "audio/ogg" }));
    }
}

export function formatElapsedTime(startTime: Date | null, eventTime: Date): string | null {
    if (!startTime) return null;
    const elapsed = eventTime.getTime() - startTime.getTime();
    if (elapsed < 0) return null;

    const totalMinutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) return `${hours}h ${minutes}m into the call`;
    if (minutes > 0) return `${minutes}m into the call`;
    return "start of call";
}

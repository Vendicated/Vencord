/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { playAudio } from "@api/AudioPlayer";
import { classNameFactory } from "@utils/css";
import { LazyComponent } from "@utils/react";
import { saveFile } from "@utils/web";
import type { User } from "@vencord/discord-types";
import { findByCode, findByPropsLazy } from "@webpack";

import settings from "./settings";

export { User };

export interface SoundEvent {
    type: "VOICE_CHANNEL_EFFECT_SEND",
    emoji: { name: string, id?: string, animated: boolean; },
    channelId: string,
    userId: string,
    animationType: number,
    animationId: number,
    soundId: string,
    soundVolume: number;
}

export interface SoundLogEntry extends SoundEvent {
    users: { id: string, plays: number[]; }[];
}

export const cl = classNameFactory("vc-soundlog-");
const EmojiManager = findByPropsLazy("getEmojiColors", "getURL");

export function getEmojiUrl(emoji) {
    if (!emoji) return EmojiManager.getURL("❓"); // If the sound doesn't have a related emoji
    return emoji.id ? `https://cdn.discordapp.com/emojis/${emoji.id}.png?size=32` : EmojiManager.getURL(emoji.name);
}

export const playSound = id => {
    playAudio(`https://cdn.discordapp.com/soundboard-sounds/${id}`, { volume: settings.store.soundVolume * 100 });
};

export async function downloadAudio(id: string): Promise<void> {
    const filename = id + settings.store.FileType;
    const original = await fetch(`https://cdn.discordapp.com/soundboard-sounds/${id}`).then(res => res.arrayBuffer());

    if (IS_DISCORD_DESKTOP) {
        const data = new Uint8Array(original);
        DiscordNative.fileManager.saveWithDialog(data, filename);
    } else {
        saveFile(new File([original], filename, { type: "audio/ogg" }));
    }
}

let listeners: Function[] = [];

export function getListeners(): Function[] {
    return listeners;
}

export function addListener(fn): void {
    listeners.push(fn);
}

export function removeListener(fn): void {
    listeners = listeners.filter(f => f !== fn);
}

// Taken from https://github.com/Vendicated/Vencord/blob/86e94343cca10b950f2dc8d18d496d6db9f3b728/src/components/PluginSettings/PluginModal.tsx#L45
export const UserSummaryItem = LazyComponent(() => findByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));
export const AvatarStyles = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");

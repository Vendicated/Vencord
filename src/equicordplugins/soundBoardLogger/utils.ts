/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { proxyLazy } from "@utils/lazy";
import { LazyComponent } from "@utils/react";
import { saveFile } from "@utils/web";
import { findByCode, findByProps, findByPropsLazy } from "@webpack";
import type { User } from "discord-types/general";

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

export function getEmojiUrl(emoji) {
    const { getURL } = proxyLazy(() => findByProps("getEmojiColors", "getURL"));
    if (!emoji) return getURL("❓"); // If the sound doesn't have a related emoji
    return emoji.id ? `https://cdn.discordapp.com/emojis/${emoji.id}.png?size=32` : getURL(emoji.name);
}

export const playSound = id => {
    const audio = new Audio(`https://cdn.discordapp.com/soundboard-sounds/${id}`);
    audio.volume = settings.store.soundVolume;
    audio.play();
};

export async function downloadAudio(id: string): Promise<void> {
    const filename = id + settings.store.FileType;
    const data = await fetch(`https://cdn.discordapp.com/soundboard-sounds/${id}`).then(e => e.arrayBuffer());


    if (IS_DISCORD_DESKTOP) {
        DiscordNative.fileManager.saveWithDialog(data, filename);
    } else {
        saveFile(new File([data], filename, { type: "audio/ogg" }));
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

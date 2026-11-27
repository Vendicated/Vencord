/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { classNameFactory } from "@api/Styles";
import { copyToClipboard } from "@utils/clipboard";
import { saveFile } from "@utils/web";
import type { User } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { showToast, UserSummaryItem } from "@webpack/common";

import settings from "./settings";

export { User, UserSummaryItem };

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

const emojiUtils = findByPropsLazy("getURL", "getEmojiColors");

export function getEmojiUrl(emoji) {
    const { getURL } = emojiUtils;
    if (!emoji) return getURL("❓"); // If the sound doesn't have a related emoji
    return emoji.id ? `https://cdn.discordapp.com/emojis/${emoji.id}.png?size=32` : getURL(emoji.name);
}

export function getPreviewVolume(): number {
    const volume = settings.store.PreviewVolume;
    return Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) : 50;
}

export const playSound = id => {
    const audio = new Audio(`https://cdn.discordapp.com/soundboard-sounds/${id}`);
    audio.volume = Math.max(0, Math.min(1, getPreviewVolume() / 100));
    audio.play().catch(() => showToast({ text: "Could not play this sound", variant: "critical" }));
};

export async function downloadAudio(id: string): Promise<void> {
    try {
        const response = await fetch(`https://cdn.discordapp.com/soundboard-sounds/${id}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        saveFile(new File([await response.blob()], `${id}.ogg`, { type: "audio/ogg" }));
    } catch {
        showToast({ text: "Could not download this sound", variant: "critical" });
    }
}

let listeners: (() => void)[] = [];

export function getListeners(): (() => void)[] {
    return listeners;
}

export function addListener(fn: () => void): void {
    listeners.push(fn);
}

export function removeListener(fn: () => void): void {
    listeners = listeners.filter(f => f !== fn);
}

export async function copyWithToast(value: string, message: string) {
    await copyToClipboard(value);
    showToast({ text: message, variant: "success" });
}

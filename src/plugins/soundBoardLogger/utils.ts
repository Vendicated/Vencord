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
import { proxyLazy } from "@utils/lazy";
import { LazyComponent } from "@utils/react";
import { saveFile } from "@utils/web";
import { findByCode, findByProps, findByPropsLazy } from "@webpack";
import settings from "./settings";
import type { User } from "discord-types/general";

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
    if (!emoji) return getURL('❓'); // If the sound doesn't have a related emoji
    return emoji.id ? `https://cdn.discordapp.com/emojis/${emoji.id}.png?size=32` : getURL(emoji.name);
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

export  function addListener(fn): void {
    listeners.push(fn)
}

export function removeListener(fn): void {
    listeners = listeners.filter(f => f !== fn);
}

// Taken from https://github.com/Vendicated/Vencord/blob/86e94343cca10b950f2dc8d18d496d6db9f3b728/src/components/PluginSettings/PluginModal.tsx#L45
export const UserSummaryItem = LazyComponent(() => findByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));
export const AvatarStyles = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");
// a
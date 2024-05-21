/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelStore, PermissionsBits, PermissionStore, UserStore } from "@webpack/common";

export function hasPermission(channelId: string, permission: bigint) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel || channel.isPrivate()) return true;
    return PermissionStore.can(permission, channel);
}

export const hasExternalEmojiPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.USE_EXTERNAL_EMOJIS);
export const hasExternalStickerPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.USE_EXTERNAL_STICKERS);
export const hasEmbedPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.EMBED_LINKS);
export const hasAttachmentPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.ATTACH_FILES);

export const canUseEmotes = () => (UserStore.getCurrentUser().premiumType ?? 0) > 0;
export const canUseStickers = () => (UserStore.getCurrentUser().premiumType ?? 0) > 1;

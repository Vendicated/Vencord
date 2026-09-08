/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByCodeLazy } from "@webpack";
import { Message } from "discord-types/general";

export const isSystemMessage = findByCodeLazy(".messageReference.guild_id===", ".author.id");

// 24 - `Activity Alerts Enabled`/`safety alert`/`has blocked a message in`/
// 36 - `enabled security actions`
// 37 - `disabled security actions`
// 39 - `resolved an Activity Alert`
// I found no more automod message types but mb they're exists
export const SECURITY_ACTION_MESSAGE_TYPES = [24, 36, 37, 39];

export const isAutoModMessage = (msg: Message) => {
    return SECURITY_ACTION_MESSAGE_TYPES.includes(msg.type);
};

const AUTO_MODERATION_EMBED_TYPE = "auto_moderation_message";

export const isAutoContentModerationMessage = (msg: Message) => {
    return msg.embeds.some(({ type }) => type === AUTO_MODERATION_EMBED_TYPE);
};

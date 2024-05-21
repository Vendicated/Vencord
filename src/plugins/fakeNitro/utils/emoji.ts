/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";
import type { Emoji } from "@webpack/types";

import { getCurrentGuildId } from "./index";
import { canUseEmotes, hasExternalEmojiPerms } from "./permissions";

const RoleSubscriptionEmojiUtils = findByPropsLazy("isUnusableRoleSubscriptionEmoji");

export function canUseEmote(e: Emoji, channelId: string) {
    if (e.type === "UNICODE") return true;
    if (e.available === false) return false;

    const isUnusableRoleSubEmoji = RoleSubscriptionEmojiUtils.isUnusableRoleSubscriptionEmojiOriginal ?? RoleSubscriptionEmojiUtils.isUnusableRoleSubscriptionEmoji;
    if (isUnusableRoleSubEmoji(e, getCurrentGuildId())) return false;

    if (canUseEmotes())
        return e.guildId === getCurrentGuildId() || hasExternalEmojiPerms(channelId);
    else
        return !e.animated && e.guildId === getCurrentGuildId();
}

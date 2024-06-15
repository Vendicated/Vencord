/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Role {
    color: number;
    colorString: string | null;
    flags: RoleFlags;
    hoist: boolean;
    icon: string | null;
    id: string;
    managed: boolean;
    mentionable: boolean;
    name: string;
    originalPosition: number;
    permissions: /* Permissions */ bigint;
    position: number;
    tags: RoleTags;
    unicodeEmoji: string | null;
}

export enum RoleFlags {
    IN_PROMPT = 1,
}

export interface RoleTags {
    available_for_purchase?: null;
    bot_id?: string;
    guild_connections?: null;
    integration_id?: string;
    premium_subscriber?: null;
    subscription_listing_id?: string;
}

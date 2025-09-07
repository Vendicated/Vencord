/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Channel, Message, Permissions, User } from "@vencord/discord-types";

import { tags } from "./consts";

export type ITag = {
    // name used for identifying, must be alphanumeric + underscores
    name: string;
    // name shown on the tag itself, can be anything probably; automatically uppercase'd
    displayName: string;
    description: string;
} & ({
    permissions: Permissions[];
} | {
    condition?(message: Message | null, user: User, channel: Channel): boolean;
});

export interface TagSetting {
    text: string;
    showInChat: boolean;
    showInNotChat: boolean;
}

export type TagSettings = {
    [k in typeof tags[number]["name"]]: TagSetting;
};

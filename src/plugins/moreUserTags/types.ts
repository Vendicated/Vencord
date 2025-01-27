/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Permissions } from "@webpack/types";
import type { Channel, Message, User } from "discord-types/general";

export interface ITag {
    // name used for identifying, must be alphanumeric + underscores
    name: string;
    // name shown on the tag itself, can be anything probably; automatically uppercase'd
    displayName: string;
    description: string;
    permissions?: Permissions[];
    condition?(message: Message | null, user: User, channel: Channel): boolean;
}

export interface TagSetting {
    text: string;
    showInChat: boolean;
    showInNotChat: boolean;
}
export interface TagSettings {
    WEBHOOK: TagSetting,
    OWNER: TagSetting,
    ADMINISTRATOR: TagSetting,
    MODERATOR_STAFF: TagSetting,
    MODERATOR: TagSetting,
    VOICE_MODERATOR: TagSetting,
    TRIAL_MODERATOR: TagSetting,
    [k: string]: TagSetting;
}

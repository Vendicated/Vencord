/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Channel } from "discord-types/general";

export interface ChannelDelete {
    type: "CHANNEL_DELETE";
    channel: Channel;
}

export interface GuildDelete {
    type: "GUILD_DELETE";
    guild: {
        id: string;
        unavailable?: boolean;
    };
}

export interface RelationshipRemove {
    type: "RELATIONSHIP_REMOVE";
    relationship: {
        id: string;
        nickname: string;
        type: number;
    };
}

export interface SimpleGroupChannel {
    id: string;
    name: string;
    iconURL?: string;
}

export interface SimpleGuild {
    id: string;
    name: string;
    iconURL?: string;
}

export const enum ChannelType {
    GROUP_DM = 3,
}

export const enum RelationshipType {
    FRIEND = 1,
    BLOCKED = 2,
    INCOMING_REQUEST = 3,
    OUTGOING_REQUEST = 4,
}

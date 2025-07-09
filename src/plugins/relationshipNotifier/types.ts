/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { Channel } from "@vencord/discord-types";

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

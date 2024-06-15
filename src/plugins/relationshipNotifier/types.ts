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

import type { ChannelRecord } from "@vencord/discord-types";

export interface ChannelDeleteAction {
    type: "CHANNEL_DELETE";
    channel: ChannelRecord;
}

export interface GuildDeleteAction {
    type: "GUILD_DELETE";
    guild: {
        id: string;
        unavailable?: boolean;
    };
}

export interface RelationshipRemoveAction {
    type: "RELATIONSHIP_REMOVE";
    relationship: {
        id: string;
        nickname: string;
        type: number;
    };
}

export interface SimpleGroupDMChannel {
    id: string;
    name: string;
    iconURL?: string;
}

export interface SimpleGuild {
    id: string;
    name: string;
    iconURL?: string;
}

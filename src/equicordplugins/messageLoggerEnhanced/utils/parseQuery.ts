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

import { ChannelStore, GuildStore } from "@webpack/common";

import { LoggedMessageJSON } from "../types";
import { getGuildIdByChannel } from "./index";
import { memoize } from "./memoize";


const validIdSearchTypes = ["server", "guild", "channel", "in", "user", "from", "message"] as const;
type ValidIdSearchTypesUnion = typeof validIdSearchTypes[number];

interface QueryResult {
    success: boolean;
    query: string;
    type?: ValidIdSearchTypesUnion;
    id?: string;
    negate?: boolean;
}

export const parseQuery = memoize((query: string = ""): QueryResult => {
    let trimmedQuery = query.trim();
    if (!trimmedQuery) {
        return { success: false, query };
    }

    let negate = false;
    if (trimmedQuery.startsWith("!")) {
        negate = true;
        trimmedQuery = trimmedQuery.substring(trimmedQuery.length, 1);
    }

    const [filter, rest] = trimmedQuery.split(" ", 2);
    if (!filter) {
        return { success: false, query };
    }

    const [type, id] = filter.split(":") as [ValidIdSearchTypesUnion, string];
    if (!type || !id || !validIdSearchTypes.includes(type)) {
        return { success: false, query };
    }

    return {
        success: true,
        type,
        id,
        negate,
        query: rest ?? ""
    };
});


export const doesMatch = (type: typeof validIdSearchTypes[number], value: string, message: LoggedMessageJSON) => {
    switch (type) {
        case "in":
        case "channel":
            const channel = ChannelStore.getChannel(message.channel_id);
            if (!channel)
                return message.channel_id === value;
            const { name, id } = channel;
            return id === value
                || name.toLowerCase().includes(value.toLowerCase());
        case "message":
            return message.id === value;
        case "from":
        case "user":
            return message.author.id === value
                || message.author?.username?.toLowerCase().includes(value.toLowerCase())
                || (message.author as any)?.globalName?.toLowerCase()?.includes(value.toLowerCase());
        case "guild":
        case "server": {
            const guildId = message.guildId ?? getGuildIdByChannel(message.channel_id);
            if (!guildId) return false;

            const guild = GuildStore.getGuild(guildId);
            if (!guild)
                return guildId === value;

            return guild.id === value
                || guild.name.toLowerCase().includes(value.toLowerCase());
        }
        default:
            return false;
    }
};

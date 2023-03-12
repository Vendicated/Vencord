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

import { FluxDispatcher, GuildMemberStore } from "@webpack/common";
import { User } from "discord-types/general";

interface GuildMembersChunkEvent {
    guildId: string;
    members: Array<{ user: User; }>;
    notFound: Array<string>;
}

/**
 * Request uncached Guild Members through the Gateway. This method also checks for receiving non existing Guild Members (Not in the guild).
 * @param ids The user ids to request. Already cached Guild Members are ignored.
 * @param guildId The id of the guild.
 * @param timeoutMs The timeout in milliseconds to reject the promise
 * @returns Whether the Guild Members were sucessfully requested and received.
 */
export async function requestMissingGuildMembers(guildId: string, ids: Array<string>, timeoutMs: number = 15 * 1000) {
    const userIdsChunks: Array<Array<string>> = [];

    for (const id of ids) {
        if (!GuildMemberStore.getMember(guildId, id)) {
            const currentChunk = userIdsChunks[userIdsChunks.length - 1] ?? [];
            if (currentChunk.length < 100) {
                currentChunk.push(id);

                if (userIdsChunks.length) userIdsChunks[userIdsChunks.length - 1] = currentChunk;
                else userIdsChunks.push(currentChunk);
            }
            else userIdsChunks.push([id]);
        }
    }

    let awaitAllChunks: Promise<void> | undefined = undefined;

    if (userIdsChunks.length > 0) {
        const allUserIds = userIdsChunks.flat();

        awaitAllChunks = new Promise<void>((res, rej) => {
            let chunksReceived = 0;
            const timeout = setTimeout(rej, timeoutMs);

            FluxDispatcher.subscribe("GUILD_MEMBERS_CHUNK", ({ guildId: chunkGuildId, members, notFound }: GuildMembersChunkEvent) => {
                if (chunkGuildId === guildId) {
                    if (
                        members.some(member => allUserIds.includes(member.user.id))
                        || notFound.some(id => allUserIds.includes(id))
                    ) {
                        chunksReceived += 1;
                    }
                }

                if (chunksReceived === userIdsChunks.length) {
                    res();
                    clearTimeout(timeout);
                }
            });
        });

        FluxDispatcher.dispatch({
            type: "GUILD_MEMBERS_REQUEST",
            guildIds: [guildId],
            userIds: allUserIds
        });
    }

    try {
        if (awaitAllChunks) await awaitAllChunks;

        return true;
    } catch {
        return false;
    }
}

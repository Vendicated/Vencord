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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByProps, findStoreLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, GuildStore, RelationshipStore, UserStore } from "@webpack/common";

const UserAffinitiesStore = findStoreLazy("UserAffinitiesStore");

export default definePlugin({
    name: "ImplicitRelationships",
    description: "Shows your implicit relationships in the Friends tab.",
    authors: [Devs.Dolfies],
    patches: [
        {
            find: "FriendsEmptyState: Invalid empty state",
            replacement: [
                // Counts header
                {
                    match: /toString\(\)\}\);case (\i\.\i)\.BLOCKED/,
                    replace: 'toString()});case $1.IMPLICIT:return "Implicit — "+arguments[1];case $1.BLOCKED'
                },
                // No friends page
                {
                    match: /case (\i\.\i)\.ONLINE:return (\i)\.SECTION_ONLINE/,
                    replace: "case $1.ONLINE:case $1.IMPLICIT:return $2.SECTION_ONLINE"
                },
                // Sections header
                {
                    match: /\(0,(\i)\.jsx\)\((\i)\.TabBar\.Item,\{id:(\i)\.(\i)\.BLOCKED,className:([^\s]+?)\.item,children:\i\.\i\.Messages\.BLOCKED\}\)/,
                    replace: "(0,$1.jsx)($2.TabBar.Item,{id:$3.$4.IMPLICIT,className:$5.item,children:\"Implicit\"}),$&"
                },
                // Sections content
                {
                    match: /(?<=case (\i\.\i)\.BLOCKED:return (\i)\.type===\i\.\i\.BLOCKED)/,
                    replace: ";case $1.IMPLICIT:return $2.type===5"
                },
                // Piggyback relationship fetch
                {
                    match: /(\i\.\i)\.fetchRelationships\(\)/,
                    // This relationship fetch is actually completely useless, but whatevs
                    replace: "$1.fetchRelationships(),$self.fetchImplicitRelationships()"
                },
            ],
        },
    ],

    hasDM(userId: string): boolean {
        return Object.values(ChannelStore.getSortedPrivateChannels()).some(channel => channel.recipients.includes(userId));
    },

    async fetchImplicitRelationships() {
        // Implicit relationships are defined as users that you:
        // 1. Have an affinity for
        // 2. Do not have a relationship with // TODO: Check how this works with pending/blocked relationships
        // 3. Have a mutual guild with
        const userAffinities: Set<string> = UserAffinitiesStore.getUserAffinitiesUserIds();
        const nonFriendAffinities = Array.from(userAffinities).filter(
            id => !RelationshipStore.getRelationshipType(id)
        );

        // I would love to just check user cache here (falling back to the gateway of course)
        // However, users in user cache may just be there because they share a DM or group DM with you
        // So there's no guarantee that a user being in user cache means they have a mutual with you
        // To get around this, we request users we have DMs with, and ignore them below if we don't get them back
        const toRequest = nonFriendAffinities.filter(id => !UserStore.getUser(id) || this.hasDM(id));
        const allGuildIds = Object.keys(GuildStore.getGuilds());
        let count = allGuildIds.length * Math.ceil(toRequest.length / 100);

        // OP 8 Request Guild Members allows 100 user IDs at a time
        // Subscribe to GUILD_MEMBERS_CHUNK and unsubscribe when we've received all the chunks
        // and hope to god the client doesn't send any other OP 8s during this time
        // as they haven't implemented the nonce parameter :grrrr:
        const ignore = new Set(toRequest);
        const callback = ({ members }) => {
            members.forEach(member => {
                ignore.delete(member.user.id);
            });
            if (--count === 0) {
                FluxDispatcher.unsubscribe("GUILD_MEMBERS_CHUNK", callback);
            }
        };
        FluxDispatcher.subscribe("GUILD_MEMBERS_CHUNK", callback);

        for (let i = 0; i < toRequest.length; i += 100) {
            FluxDispatcher.dispatch({
                type: "GUILD_MEMBERS_REQUEST",
                guildIds: allGuildIds,
                userIds: toRequest.slice(i, i + 100),
            });
        }
        for (let i = 0; i < 50 && count > 0; i++) {
            await new Promise(r => setTimeout(r, 100));
        }

        const implicitRelationships = nonFriendAffinities.map(id => UserStore.getUser(id)).filter(user => user && !ignore.has(user.id));
        const { relationships } = RelationshipStore.__getLocalVars();
        implicitRelationships.forEach(user => relationships[user.id] = 5);

        RelationshipStore.emitChange();
    },

    start() {
        const FriendsSections = findByProps("ONLINE", "ALL", "PENDING", "BLOCKED");
        FriendsSections.IMPLICIT = "IMPLICIT";
    }
});

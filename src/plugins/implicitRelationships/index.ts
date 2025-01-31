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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ChannelStore, Constants, FluxDispatcher, GuildStore, RelationshipStore, SnowflakeUtils, UserStore } from "@webpack/common";
import { Settings } from "Vencord";

const UserAffinitiesStore = findStoreLazy("UserAffinitiesStore");

export default definePlugin({
    name: "ImplicitRelationships",
    description: "Shows your implicit relationships in the Friends tab.",
    authors: [Devs.Dolfies],
    patches: [
        // Counts header
        {
            find: "#{intl::FRIENDS_ALL_HEADER}",
            replacement: {
                match: /toString\(\)\}\);case (\i\.\i)\.BLOCKED/,
                replace: 'toString()});case $1.IMPLICIT:return "Implicit — "+arguments[1];case $1.BLOCKED'
            },
        },
        // No friends page
        {
            find: "FriendsEmptyState: Invalid empty state",
            replacement: {
                match: /case (\i\.\i)\.ONLINE:(?=return (\i)\.SECTION_ONLINE)/,
                replace: "case $1.ONLINE:case $1.IMPLICIT:"
            },
        },
        // Sections header
        {
            find: "#{intl::FRIENDS_SECTION_ONLINE}",
            replacement: {
                match: /(\(0,\i\.jsx\)\(\i\.\i\.Item,\{id:\i\.\i)\.BLOCKED,className:([^\s]+?)\.item,children:\i\.\i\.string\(\i\.\i#{intl::BLOCKED}\)\}\)/,
                replace: "$1.IMPLICIT,className:$2.item,children:\"Implicit\"}),$&"
            },
        },
        // Sections content
        {
            find: '"FriendsStore"',
            replacement: {
                match: /(?<=case (\i\.\i)\.BLOCKED:return (\i)\.type===\i\.\i\.BLOCKED)/,
                replace: ";case $1.IMPLICIT:return $2.type===5"
            },
        },
        // Piggyback relationship fetch
        {
            find: '"FriendsStore',
            replacement: {
                match: /(\i\.\i)\.fetchRelationships\(\)/,
                // This relationship fetch is actually completely useless, but whatevs
                replace: "$1.fetchRelationships(),$self.fetchImplicitRelationships()"
            },
        },
        // Modify sort -- thanks megu for the patch (from sortFriendRequests)
        {
            find: "getRelationshipCounts(){",
            replacement: {
                predicate: () => Settings.plugins.ImplicitRelationships.sortByAffinity,
                match: /\}\)\.sortBy\((.+?)\)\.value\(\)/,
                replace: "}).sortBy(row => $self.wrapSort(($1), row)).value()"
            }
        },

        // Add support for the nonce parameter to Discord's shitcode
        {
            find: ".REQUEST_GUILD_MEMBERS",
            replacement: {
                match: /\.send\(8,{/,
                replace: "$&nonce:arguments[1].nonce,"
            }
        },
        {
            find: "GUILD_MEMBERS_REQUEST:",
            replacement: {
                match: /presences:!!(\i)\.presences/,
                replace: "$&,nonce:$1.nonce"
            },
        },
        {
            find: ".not_found",
            replacement: {
                match: /notFound:(\i)\.not_found/,
                replace: "$&,nonce:$1.nonce"
            },
        }
    ],
    settings: definePluginSettings(
        {
            sortByAffinity: {
                type: OptionType.BOOLEAN,
                default: true,
                description: "Whether to sort implicit relationships by their affinity to you.",
                restartNeeded: true
            },
        }
    ),

    wrapSort(comparator: Function, row: any) {
        return row.type === 5
            ? -(UserAffinitiesStore.getUserAffinity(row.user.id)?.affinity ?? 0)
            : comparator(row);
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
        const dmUserIds = new Set(
            Object.values(ChannelStore.getSortedPrivateChannels()).flatMap(c => c.recipients)
        );
        const toRequest = nonFriendAffinities.filter(id => !UserStore.getUser(id) || dmUserIds.has(id));
        const allGuildIds = Object.keys(GuildStore.getGuilds());
        const sentNonce = SnowflakeUtils.fromTimestamp(Date.now());
        let count = allGuildIds.length * Math.ceil(toRequest.length / 100);

        // OP 8 Request Guild Members allows 100 user IDs at a time
        const ignore = new Set(toRequest);
        const relationships = RelationshipStore.getRelationships();
        const callback = ({ chunks }) => {
            for (const chunk of chunks) {
                const { nonce, members } = chunk;
                if (nonce !== sentNonce) return;
                members.forEach(member => {
                    ignore.delete(member.user.id);
                });

                nonFriendAffinities.map(id => UserStore.getUser(id)).filter(user => user && !ignore.has(user.id)).forEach(user => relationships[user.id] = 5);
                RelationshipStore.emitChange();
                if (--count === 0) {
                    // @ts-ignore
                    FluxDispatcher.unsubscribe("GUILD_MEMBERS_CHUNK_BATCH", callback);
                }
            }
        };

        // @ts-ignore
        FluxDispatcher.subscribe("GUILD_MEMBERS_CHUNK_BATCH", callback);
        for (let i = 0; i < toRequest.length; i += 100) {
            FluxDispatcher.dispatch({
                type: "GUILD_MEMBERS_REQUEST",
                guildIds: allGuildIds,
                userIds: toRequest.slice(i, i + 100),
                nonce: sentNonce,
            });
        }
    },

    start() {
        Constants.FriendsSections.IMPLICIT = "IMPLICIT";
    }
});

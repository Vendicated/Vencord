/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore } from "@webpack/common";
import { User } from "discord-types/general";
import { Settings } from "Vencord";

export default definePlugin({
    name: "SortFriendRequests",
    authors: [Devs.Megu],
    description: "Sorts friend requests by date of receipt",

    patches: [{
        find: ".PENDING_INCOMING||",
        replacement: [{
            match: /\.sortBy\(\(function\((\w)\){return \w{1,3}\.comparator}\)\)/,
            // If the row type is 3 or 4 (pendinng incoming or outgoing), sort by date of receipt
            // Otherwise, use the default comparator
            replace: (_, row) => `.sortBy((function(${row}) {
                return ${row}.type === 3 || ${row}.type === 4
                    ? -Vencord.Plugins.plugins.SortFriendRequests.getSince(${row}.user)
                    : ${row}.comparator
            }))`
        }, {
            predicate: () => Settings.plugins.SortFriendRequests.showDates,
            match: /(user:(\w{1,3}),.{10,30}),subText:(\w{1,3}),(.{10,30}userInfo}\))/,
            // Show dates in the friend request list
            replace: (_, pre, user, subText, post) => `${pre},
                subText: Vencord.Plugins.plugins.SortFriendRequests.makeSubtext(${subText}, ${user}),
                ${post}`
        }]
    }],

    getSince(user: User) {
        return new Date(RelationshipStore.getSince(user.id));
    },

    makeSubtext(text: string, user: User) {
        const since = this.getSince(user);
        return (
            <Flex flexDirection="row" style={{ gap: 0, flexWrap: "wrap", lineHeight: "0.9rem" }}>
                <span>{text}</span>
                {!isNaN(since.getTime()) && <span>Received &mdash; {since.toDateString()}</span>}
            </Flex>
        );
    },

    options: {
        showDates: {
            type: OptionType.BOOLEAN,
            description: "Show dates on friend requests",
            default: false,
            restartNeeded: true
        }
    }
});

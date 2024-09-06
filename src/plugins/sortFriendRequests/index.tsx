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

import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { type RecordBase, RelationshipType, type UserRecord } from "@vencord/discord-types";
import { RelationshipStore } from "@webpack/common";

const settings = definePluginSettings({
    showDates: {
        type: OptionType.BOOLEAN,
        description: "Show dates on friend requests",
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "SortFriendRequests",
    authors: [Devs.Megu],
    description: "Sorts friend requests by date of receipt",
    settings,

    patches: [
        {
            find: "getRelationshipCounts(){",
            replacement: {
                match: /\}\)\.sortBy\((.+?)\)\.value\(\)/,
                replace: "}).sortBy(row => $self.wrapSort(($1), row)).value()"
            }
        },
        {
            find: ".Messages.FRIEND_REQUEST_CANCEL",
            replacement: {
                predicate: () => settings.store.showDates,
                match: /subText:(\i)(?<=user:(\i).+?)/,
                replace: (_, subtext, user) => `subText:$self.makeSubtext(${subtext},${user})`
            }
        }
    ],

    wrapSort(
        comparator: (row: RecordBase & Record<string, any>) => [type: RelationshipType, name: string],
        row: RecordBase & Record<string, any>
    ) {
        return row.type === RelationshipType.PENDING_INCOMING || row.type === RelationshipType.PENDING_OUTGOING
            ? -this.getSince(row.user)
            : comparator(row);
    },

    getSince(user: UserRecord) {
        return new Date(RelationshipStore.getSince(user.id)!);
    },

    makeSubtext(text: string, user: UserRecord) {
        const since = this.getSince(user);
        return (
            <Flex flexDirection="column" style={{ gap: 0, flexWrap: "wrap", lineHeight: "0.9rem" }}>
                <span>{text}</span>
                {!Number.isNaN(since.getTime()) && <span>Received &mdash; {since.toDateString()}</span>}
            </Flex>
        );
    }
});

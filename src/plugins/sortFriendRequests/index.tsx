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
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore, Text } from "@webpack/common";
import { User } from "discord-types/general";
import { PropsWithChildren } from "react";

function getSince(user: User) {
    return new Date(RelationshipStore.getSince(user.id));
}

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

    patches: [{
        find: "getRelationshipCounts(){",
        replacement: {
            match: /\}\)\.sortBy\((.+?)\)\.value\(\)/,
            replace: "}).sortBy(row => $self.wrapSort(($1), row)).value()"
        }
    }, {
        find: "#{intl::FRIEND_REQUEST_CANCEL}",
        replacement: {
            predicate: () => settings.store.showDates,
            match: /(?<=\.listItemContents,children:\[)\(0,.+?(?=,\(0)(?<=user:(\i).+?)/,
            replace: (children, user) => `$self.WrapperDateComponent({user:${user},children:${children}})`
        }
    }],

    wrapSort(comparator: Function, row: any) {
        return row.type === 3 || row.type === 4
            ? -getSince(row.user)
            : comparator(row);
    },

    WrapperDateComponent: ErrorBoundary.wrap(({ user, children }: PropsWithChildren<{ user: User; }>) => {
        const since = getSince(user);

        return <Flex flexDirection="row" style={{ alignItems: "center", justifyContent: "space-between", width: "100%", marginRight: "0.5em" }}>
            {children}
            {!isNaN(since.getTime()) && <Text variant="text-xs/normal" color="text-muted">{since.toDateString()}</Text>}
        </Flex>;
    })
});

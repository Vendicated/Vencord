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

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { DateUtils, RelationshipStore, Text, TooltipContainer } from "@webpack/common";
import { PropsWithChildren } from "react";

const formatter = new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
});

const cl = classNameFactory("vc-sortFriendRequests-");

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

        return <div className={cl("wrapper")}>
            {children}
            {!isNaN(since.getTime()) && (
                <TooltipContainer text={DateUtils.dateFormat(since, "LLLL")} tooltipClassName={cl("tooltip")}>
                    <Text variant="text-xs/normal" className={cl("date")}>{formatter.format(since)}</Text>
                </TooltipContainer>
            )}
        </div>;
    }, { noop: true })
});

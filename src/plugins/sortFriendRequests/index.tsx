/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
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

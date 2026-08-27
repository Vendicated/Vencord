/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { TooltipContainer } from "@components/TooltipContainer";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { Constants, DateUtils, FriendsStore, RelationshipStore, Text } from "@webpack/common";
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
    },
    sortFriendsBy: {
        type: OptionType.SELECT,
        description: "Sort order for the friends list (not requests)",
        default: "default",
        options: [
            { label: "Oldest First", value: "oldest" },
            { label: "Newest First", value: "newest" },
            { label: "Default Sorting", value: "default" }
        ]
    }
});

export default definePlugin({
    name: "SortFriendRequests",
    authors: [Devs.Megu, Devs["0bi0"]],
    description: "Sorts friend requests by date of receipt, and sorts the friends list by date added",
    tags: ["Friends", "Organisation"],
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
            find: "#{intl::FRIEND_REQUEST_CANCEL}",
            replacement: {
                predicate: () => settings.store.showDates,
                match: /(?<=children:\[)\(0,.{0,100}user:\i,hovered:\i.+?(?=,\(0)(?<=user:(\i).+?)/,
                replace: (children, user) => `$self.WrapperDateComponent({user:${user},children:${children}})`
            }
        },
        {
            find: "#{intl::FRIENDS_SECTION_ONLINE}),className:",
            replacement: {
                match: /,{id:(\i\.\i)\.PENDING,show:.+?className:(\i\.\i)(?=\},\{id:)/,
                replace: (rest, relationShipTypes, className) => `,{id:${relationShipTypes}.SORT,show:true,className:${className},content:$self.getSortTitle()}${rest}`
            }
        },
        {
            find: "FRIENDS_SET_SECTION:",
            replacement: {
                match: /FRIENDS_SET_SECTION:function\((\i)\){(\i)=\1\.section,(\i)\(\)}/,
                replace: 'FRIENDS_SET_SECTION:function($1){if($1.section==="SORT"){return $self.cycleSortFriendsBy()}$2=$1.section,$3()}'
            }
        }
    ],

    sinceCache: new Map<string, number>(),

    getCachedSince(userId: string): number {
        let cached = this.sinceCache.get(userId);
        if (cached === undefined) {
            cached = getSince({ id: userId } as User).getTime();
            this.sinceCache.set(userId, cached);
        }
        return cached;
    },

    wrapSort(comparator: Function, row: any) {
        if (row.type === 3 || row.type === 4) {
            return -getSince(row.user);
        }

        if (row.type === 1 && settings.store.sortFriendsBy !== "default") {
            const state = FriendsStore.getState();
            const isSortableTab =
                state.section === "ALL" || state.section === Constants.FriendsSections.ALL ||
                state.section === "ONLINE" || state.section === Constants.FriendsSections.ONLINE;

            if (isSortableTab) {
                const timestamp = this.getCachedSince(row.userId);
                return settings.store.sortFriendsBy === "newest" ? -timestamp : timestamp;
            }
        }

        return comparator(row);
    },

    getSortTitle() {
        switch (settings.store.sortFriendsBy) {
            case "newest":
                return "Sort (newest)";
            case "oldest":
                return "Sort (oldest)";
            case "default":
            default:
                return "Sort (default)";
        }
    },

    cycleSortFriendsBy() {
        switch (settings.store.sortFriendsBy) {
            case "default":
                settings.store.sortFriendsBy = "oldest";
                break;
            case "oldest":
                settings.store.sortFriendsBy = "newest";
                break;
            case "newest":
            default:
                settings.store.sortFriendsBy = "default";
                break;
        }
        FriendsStore.emitChange();
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
    }, { noop: true }),

    start() {
        Constants.FriendsSections.SORT = "SORT";
        try {
            const friendIds = RelationshipStore.getFriendIDs();
            for (const id of friendIds) {
                this.getCachedSince(id);
            }
        } catch (e) {
            console.error("[SortFriendRequests] Failed to prime friend-since cache:", e);
        }
    }
});
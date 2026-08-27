/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore, FriendsStore, Constants } from "@webpack/common";

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Allows friend sorting in friends list by oldest/newest/default",
        default: true
    },
    sortOrder: {
        type: OptionType.SELECT,
        description: "Sort order for friends",
        default: "oldest",
        options: [
            { label: "Oldest First", value: "oldest" },
            { label: "Newest First", value: "newest" },
            { label: "Default Sorting", value: "default" }
        ]
    }
});

export default definePlugin({
    name: "SortFriendsByDate",
    description: "Sorts friends by oldest/newest/default in friends list",
    tags: ["Friends"],
    authors: [Devs["0bi0"]],
    settings,

    // Same logic as implicitRelationships
    patches: [
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
                replace: 'FRIENDS_SET_SECTION:function($1){if($1.section==="SORT"){return $self.sortFriendsByDate()}$2=$1.section,$3()}'
            }
        },
        {
            find: "getRelationshipCounts(){",
            replacement: {
                match: /\}\)\.sortBy\((.+?)\)\.value\(\)/,
                replace: "}).sortBy(row => $self.sortByFriendsSince($1, row)).value()"
            }
        }
    ],

    Cache: new Map<string, number>(),

    getCachedSince(userId: string): number {
        let cached = this.Cache.get(userId);
        if (cached === undefined) {
            const since = RelationshipStore.getSince(userId);
            cached = new Date(since).getTime();
            this.Cache.set(userId, cached);
        }
        return cached;
    },

    sortByFriendsSince(originalComparator: Function, row: any) {
        if (!settings.store.enabled || settings.store.sortOrder === "default") {
            return originalComparator(row);
        }

        const state = FriendsStore.getState();
        const isSortableTab =
            state.section === "ALL" || state.section === Constants.FriendsSections.ALL ||
            state.section === "ONLINE" || state.section === Constants.FriendsSections.ONLINE;

        if (isSortableTab && row.type === 1) {
            const timestamp = this.getCachedSince(row.userId);
            return settings.store.sortOrder === "newest" ? -timestamp : timestamp;
        }
        return originalComparator(row);
    },


    getSortTitle() {
        switch (settings.store.sortOrder) {
            case "newest":
                return "Sort (newest)";
            case "default":
                return "Sort (default)";
            case "oldest":
            default:
                return "Sort (oldest)";
        }
    },

    sortFriendsByDate() {
        switch (settings.store.sortOrder) {
            case "oldest":
                settings.store.sortOrder = "newest";
                break;
            case "newest":
                settings.store.sortOrder = "default";
                break;
            case "default":
            default:
                settings.store.sortOrder = "oldest";
                break;
        }
        FriendsStore.emitChange();
    },

    start() {
        Constants.FriendsSections.SORT = "SORT";
        try {
            const friendIds = RelationshipStore.getFriendIDs();
            for (const id of friendIds) {
                this.getCachedSince(id);
            }
        } catch (e) {
            console.error("[ERROR] Can't load friend IDs (the plugin dev is stupid):", e);
        }
    }
});










// Read if cute
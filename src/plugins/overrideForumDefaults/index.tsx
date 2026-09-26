/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, Menu, ReadStateStore } from "@webpack/common";

const settings = definePluginSettings({
    defaultLayout: {
        type: OptionType.SELECT,
        options: [
            { label: "List", value: 1, default: true },
            { label: "Gallery", value: 2 }
        ],
        description: "Which layout to use as default"
    },
    defaultSortOrder: {
        type: OptionType.SELECT,
        options: [
            { label: "Recently Active", value: 0, default: true },
            { label: "Date Posted", value: 1 }
        ],
        description: "Which sort order to use as default"
    },
    keepSortMenuOpenOnChange: {
        type: OptionType.BOOLEAN,
        description: "Keep the sort menu open after changing the unread setting"
    }
})
    .withPrivateSettings<{
        sortByUnread: boolean;
    }>();

export default definePlugin({
    name: "OverrideForumDefaults",
    description: "Allows you to override default forum layout/sort order or sort by unread. You can still change it on a per-channel basis",
    tags: ["Servers", "Organisation", "Customisation"],
    authors: [Devs.Inbestigator],
    contextMenus: {
        "sort-and-view": (children, props) => {
            const { sortByUnread } = settings.use(["sortByUnread"]);
            const group = findGroupChildrenByChildId("sort-by-recent-activity", children);
            console.log("SortByUnread", sortByUnread, group);
            if (!group) return;

            group.splice(0, 0,
                <Menu.MenuCheckboxItem
                    id="unread-first"
                    label="Unread first"
                    checked={sortByUnread}
                    action={() => {
                        settings.store.sortByUnread = !sortByUnread;
                        FluxDispatcher.dispatch({ type: "RESORT_THREADS", channelId: props.channel.id });
                        if (!settings.store.keepSortMenuOpenOnChange) props.closePopout();
                    }}
                />
            );
        }
    },
    patches: [
        {
            find: "getDefaultLayout(){",
            replacement: [
                {
                    match: /}getDefaultLayout\(\){/,
                    replace: "$&return $self.getLayout();"
                },
                {
                    match: /}getDefaultSortOrder\(\){/,
                    replace: "$&return $self.getSortOrder();"
                }
            ]
        },
        {
            find: "{refreshThreadIds:!0}",
            replacement: [
                {
                    match: /(return function\((\i),(\i)\)\{)(.{0,75}\i===\i\.\i\.LATEST_ACTIVITY)/,
                    replace: "$1const unreadCompare=$self.comparePosts($2,$3);if(unreadCompare!==0)return unreadCompare;$4"
                }
            ]
        }
    ],

    getLayout: () => settings.store.defaultLayout,
    getSortOrder: () => settings.store.defaultSortOrder,
    comparePosts: (a, b) => {
        if (!settings.store?.sortByUnread) return 0;
        const aUnread = ReadStateStore.hasTrackedUnread(a);
        const bUnread = ReadStateStore.hasTrackedUnread(b);
        if (aUnread && !bUnread) return -1;
        if (!aUnread && bUnread) return 1;
        return 0;
    },

    settings
});

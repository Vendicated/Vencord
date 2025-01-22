/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher, Menu, ReadStateStore } from "@webpack/common";

const settings = definePluginSettings({})
    .withPrivateSettings<{
        sortByUnread: boolean;
    }>();

export default definePlugin({
    name: "SortForumsByUnread",
    description: "Sort forum posts by unread status",
    authors: [Devs.Suffocate],

    settings,

    contextMenus: {
        "sort-and-view": (children, props) => {
            const group = findGroupChildrenByChildId("sort-by-recent-activity", children);
            if (!group) return;

            group.splice(0, 0,
                <Menu.MenuCheckboxItem
                    id="unread-first"
                    label="Unread first"
                    checked={settings.store?.sortByUnread}
                    action={() => {
                        settings.store.sortByUnread = !settings.store?.sortByUnread;
                        FluxDispatcher.dispatch({ type: "RESORT_THREADS", channelId: props.channel.id });
                        props.closePopout();
                    }}
                />
            );
        }
    },

    patches: [
        {
            find: "{refreshThreadIds:!0}",
            replacement: [
                {
                    match: /if\(\i===(?<=function\((\i),(\i)\).{0,75})/,
                    replace: "const unreadCompare=$self.comparePosts($1,$2);if(unreadCompare!==0)return unreadCompare;$&"
                }
            ]
        }
    ],

    comparePosts: (a, b) => {
        if (!settings.store?.sortByUnread) return 0;
        const aUnread = ReadStateStore.hasTrackedUnread(a);
        const bUnread = ReadStateStore.hasTrackedUnread(b);
        if (aUnread && !bUnread) return -1;
        if (!aUnread && bUnread) return 1;
        return 0;
    }
});

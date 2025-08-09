/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { patchActivityList } from "./patch-helpers/activityList";
import { showAllActivitiesComponent } from "./patch-helpers/popout";
import { settings } from "./settings";

migratePluginSettings("BetterActivities", "MemberListActivities");

export default definePlugin({
    name: "BetterActivities",
    description: "Shows activity icons in the member list and allows showing all activities",
    authors: [
        Devs.D3SOX,
        Devs.Arjix,
        Devs.AutumnVN
    ],
    tags: ["activity"],

    settings,

    patchActivityList,

    showAllActivitiesComponent,

    patches: [
        {
            // Patch activity icons
            find: "isBlockedOrIgnored(null",
            replacement: [
                {
                    match: /(?<=className:\i,children:\[).*?(?=\i\(\),\i&&)/,
                    replace: "",
                    predicate: () => settings.store.removeGameActivityStatus,
                },
                {
                    match: /(?<=hideTooltip:.{0,4}}=(\i).*?{}\))\]/,
                    replace: ",$self.patchActivityList($1)]",
                    predicate: () => settings.store.memberList,
                }
            ],
            all: true
        },
        {
            // Show all activities in the user popout/sidebar
            find: '"UserProfilePopoutBody"',
            replacement: {
                match: /(?<=(\i)\.id\)\}\)\),(\i).*?,)\i\?.{0,250}onClose:\i\}\)/,
                replace: "$self.showAllActivitiesComponent({ activity: $2, user: $1 })"
            },
            predicate: () => settings.store.userPopout
        },
        {
            find: ".SIDEBAR}),nicknameIcons",
            replacement: {
                match: /(?<=(\i)\.id\)\}\)\),(\i).*?,)\i\?.{0,250}\i\.card\}\)/,
                replace: "$self.showAllActivitiesComponent({ activity: $2, user: $1 })"
            },
            predicate: () => settings.store.userPopout
        },
        {
            find: "#{intl::STATUS_MENU_LABEL}",
            replacement: {
                match: /(?<=,(\i)=.{0,10}\i\.id.{0,150}userId:(\i).*?,)\i\?.{0,250}onClose:\i\}\)/,
                replace: "$self.showAllActivitiesComponent({ activity: $1, user: $2 })"
            },
            predicate: () => settings.store.userPopout
        }
    ],
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore } from "@webpack/common";

// const logger = new Logger("ActiveNowHideIgnored");
const settings = definePluginSettings({
    hideActiveNow: {
        description: "Hide Active Now entries for ignored users",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
    },
    hideFriendsList: {
        description: "Hide Active Now entries for ignored users in the friends list",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
    },
    ignoredUsers: {
        description: "List of user IDs to hide from Active Now (one per line)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false,
    },
});


// it break them yeey
export default definePlugin({
    name: "Active Now Hide Ignored",
    description: "Hides Active Now entries for ignored users.",
    authors: [{ name: "kyrillk", id: 0n }],

    patches: [
        {
            find: "NOW_PLAYING_CARD_HOVERED,",
            replacement: {
                match: /{partiedMembers:(\i)(.*),\i=\i\(\)\(\i,\i\);/,
                replace: "$&if($self.isIgnored($1)){return null;}",
            },
            predicate: () => settings.store.hideActiveNow
        },

    ],
    settings,
    isIgnored(users) {
        const ignoredUsers = (settings.store.ignoredUsers || "");
        for (const user of users) {
            const userId = user.id;
            if (ignoredUsers.includes(userId) || RelationshipStore.isIgnored(userId)) {
                return true;
            }
        }
        return false;
    },
});


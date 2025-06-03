/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore } from "@webpack/common";

enum ActiveNowHideIgnoredSettings {
    Off,
    HideServer,
    HideUser
}


// const logger = new Logger("ActiveNowHideIgnored");
const settings = definePluginSettings({
    hideActiveNow: {
        type: OptionType.SELECT,
        description: "Show the folder icon above the folder guilds in the BetterFolders sidebar",
        options: [
            { label: "hide user", value: ActiveNowHideIgnoredSettings.HideUser, default: true },
            { label: "hide server", value: ActiveNowHideIgnoredSettings.HideServer },
            { label: "off", value: ActiveNowHideIgnoredSettings.Off }
        ],
        restartNeeded: true
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
                replace: "$&if($self.anyIgnored($1)){return null;}",
            },
            predicate: () => settings.store.hideActiveNow === ActiveNowHideIgnoredSettings.HideServer
        },
        {
            find: "NOW_PLAYING_CARD_HOVERED,",
            replacement: {
                match: /(\{partiedMembers:)(\i)(,.*?\}=\i)/,
                replace: "$1unfilter$2$3,$2=$self.filterIgnoredUsers(unfilter$2)",
            },
            predicate: () => settings.store.hideActiveNow === ActiveNowHideIgnoredSettings.HideUser
        },
        {
            find: "}=this.state,{children:",
            replacement: {
                match: /user:(\i)(.*)this.props;/,
                replace: "$&if($self.isIgnored($1)){return null;}",
            },
            predicate: () => settings.store.hideFriendsList
        },

    ],
    settings,
    isIgnored(user) {
        const ignoredUsers = (settings.store.ignoredUsers || "");
        const userId = user.id;
        if (ignoredUsers.includes(userId) || RelationshipStore.isIgnored(userId)) {
            return true;
        }
        return false;
    },
    anyIgnored(users) {
        return users.some(user => this.isIgnored(user));
    },
    filterIgnoredUsers(users) {
        return users.filter(user => !this.isIgnored(user));
    }
});


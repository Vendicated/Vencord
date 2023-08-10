/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { onChannelDelete, onGuildDelete, onRelationshipRemove, removeFriend, removeGroup, removeGuild } from "./functions";
import settings from "./settings";
import { syncAndRunChecks, syncFriends, syncGroups, syncGuilds } from "./utils";

export default definePlugin({
    name: "RelationshipNotifier",
    description: "Notifies you when a friend, group chat, or server removes you.",
    authors: [Devs.nick],
    settings,

    patches: [
        {
            find: "removeRelationship:function(",
            replacement: {
                match: /(removeRelationship:function\((\i),\i,\i\){)/,
                replace: "$1$self.removeFriend($2);"
            }
        },
        {
            find: "leaveGuild:function(",
            replacement: {
                match: /(leaveGuild:function\((\i)\){)/,
                replace: "$1$self.removeGuild($2);"
            }
        },
        {
            find: "closePrivateChannel:function(",
            replacement: {
                match: /(closePrivateChannel:function\((\i)\){)/,
                replace: "$1$self.removeGroup($2);"
            }
        }
    ],

    flux: {
        GUILD_CREATE: syncGuilds,
        GUILD_DELETE: onGuildDelete,
        CHANNEL_CREATE: syncGroups,
        CHANNEL_DELETE: onChannelDelete,
        RELATIONSHIP_ADD: syncFriends,
        RELATIONSHIP_UPDATE: syncFriends,
        RELATIONSHIP_REMOVE(e) {
            onRelationshipRemove(e);
            syncFriends();
        },
        CONNECTION_OPEN: syncAndRunChecks
    },

    async start() {
        setTimeout(() => {
            syncAndRunChecks();
        }, 5000);
    },

    removeFriend,
    removeGroup,
    removeGuild
});

/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher, RelationshipStore } from "@webpack/common";

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
                "match": /(removeRelationship:function\((\i),\i,\i\){)/,
                "replace": "$1$self.removeFriend($2);"
            }
        },
        {
            find: "leaveGuild:function(",
            replacement: {
                "match": /(leaveGuild:function\((\i)\){)/,
                "replace": "$1$self.removeGuild($2);"
            }
        },
        {
            find: "closePrivateChannel:function(",
            replacement: {
                "match": /(closePrivateChannel:function\((\i)\){)/,
                "replace": "$1$self.removeGroup($2);"
            }
        }
    ],
    async start() {
        await syncAndRunChecks();
        FluxDispatcher.subscribe("GUILD_CREATE", syncGuilds);
        FluxDispatcher.subscribe("GUILD_DELETE", onGuildDelete);
        FluxDispatcher.subscribe("CHANNEL_CREATE", syncGroups);
        FluxDispatcher.subscribe("CHANNEL_DELETE", onChannelDelete);
        FluxDispatcher.subscribe("RELATIONSHIP_REMOVE", onRelationshipRemove);
        ["RELATIONSHIP_ADD", "RELATIONSHIP_UPDATE", "RELATIONSHIP_REMOVE"].forEach(e => FluxDispatcher.subscribe(e, syncFriends));
    },
    stop() {
        FluxDispatcher.unsubscribe("GUILD_CREATE", syncGuilds);
        FluxDispatcher.unsubscribe("GUILD_DELETE", onGuildDelete);
        FluxDispatcher.unsubscribe("CHANNEL_CREATE", syncGroups);
        FluxDispatcher.unsubscribe("CHANNEL_DELETE", onChannelDelete);
        FluxDispatcher.unsubscribe("RELATIONSHIP_REMOVE", onRelationshipRemove);
        ["RELATIONSHIP_ADD", "RELATIONSHIP_UPDATE", "RELATIONSHIP_REMOVE"].forEach(e => FluxDispatcher.unsubscribe(e, syncFriends));
    },
    removeFriend,
    removeGroup,
    removeGuild
});

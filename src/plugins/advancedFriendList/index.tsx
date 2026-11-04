/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { RelationshipType } from "@vencord/discord-types/enums";
import { Constants, RelationshipStore } from "@webpack/common";

export default definePlugin({
    name: "AdvancedFriendList",
    description: "Adds Blocked and Ignored tabs to the Friends list",
    tags: ["Friends"],
    authors: [Devs.Kaerion],

    getLocaleText(key: string) {
        return getIntlMessage(key);
    },

    isIgnored(row: any) {
        return RelationshipStore.isIgnored(row.userId);
    },

    patches: [
        {
            find: "#{intl::FRIENDS_SECTION_ONLINE}),className:",
            replacement: {
                match: /,{id:(\i\.\i)\.PENDING,show:.+?className:(\i\.\i)(?=\},\{id:)/,
                replace: (rest, relationShipTypes, className) => `,{id:${relationShipTypes}.BLOCKED,show:true,className:${className},content:$self.getLocaleText("BLOCKED")},{id:${relationShipTypes}.IGNORED,show:true,className:${className},content:$self.getLocaleText("IGNORED")}${rest}`
            },
        },

        {
            find: '"FriendsStore"',
            replacement: {
                match: /(?<=case (\i\.\i)\.SUGGESTIONS:return \d+===(\i)\.type)/,
                replace: `;case $1.BLOCKED:return $2.type===${RelationshipType.BLOCKED};case $1.IGNORED:return $self.isIgnored($2)`
            },
        },

        {
            find: "#{intl::FRIENDS_ALL_HEADER}",
            replacement: {
                match: /case (\i\.\i)\.ONLINE:(?=return [^;]+?\{online:)/,
                replace: 'case $1.BLOCKED:return $self.getLocaleText("BLOCKED")+" — "+arguments[1];case $1.IGNORED:return $self.getLocaleText("IGNORED")+" — "+arguments[1];$&'
            },
        },

        {
            find: "FriendsEmptyState: Invalid empty state",
            replacement: {
                match: /case (\i\.\i)\.ALL:(?=return \i\.SECTION_ALL)/,
                replace: "$&case $1.BLOCKED:case $1.IGNORED:"
            },
        },
    ],

    start() {
        Constants.FriendsSections.BLOCKED = "BLOCKED";
        Constants.FriendsSections.IGNORED = "IGNORED";
    }
});

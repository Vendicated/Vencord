/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "MemberListDecoratorsAPI",
    description: "API to add decorators to member list (both in servers and DMs)",
    authors: [Devs.TheSun],
    patches: [
        {
            find: "lostPermissionTooltipText,",
            replacement: {
                match: /Fragment,{children:\[(.{30,80})\]/,
                replace: "Fragment,{children:Vencord.Api.MemberListDecorators.__addDecoratorsToList(this.props).concat($1)"
            }
        },
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /(subText:(.{1,2})\.renderSubtitle\(\).{1,50}decorators):(.{30,100}:null)/,
                replace: "$1:Vencord.Api.MemberListDecorators.__addDecoratorsToList($2.props).concat($3)"
            }
        }
    ],
});

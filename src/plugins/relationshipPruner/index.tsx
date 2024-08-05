/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory, disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";

import { FriendPruneModal } from "./components/FriendPruneModal";
import { GuildPruneModal } from "./components/GuildPruneModal";
import style from "./style.css?managed";

export const cl = classNameFactory("vc-relationshipPruner-");

export default definePlugin({
    name: "RelationshipPruner",
    description: "Adds a way to easily prune your servers and friends. To open, right click the home button or friends tab button",
    authors:
    [
        Devs.Samwich
    ],
    onContextMenu(type)
    {
        openModal(props => (type === "guild" ? <GuildPruneModal {...props}/> : <FriendPruneModal {...props}/>));
    },
    patches: [
        {
            find: ".DISCODO_DISABLED",
            replacement: {
                match: /.NavItem,{/,
                replace: "$&onContextMenu:() => $self.onContextMenu(\"guild\"),"
            }
        },
        {
            find: "friends_tab_no_track",
            replacement:
            {
                match: /text:\i.\i.Messages.FRIENDS,onClick:/,
                replace: "onContextMenu:() => $self.onContextMenu(\"friend\"), $&"
            }
        }
    ],
    start() {
        enableStyle(style);
    },
    stop() {
        disableStyle(style);
    }
});

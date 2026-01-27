/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, NavigationRouter } from "@webpack/common";

function jumpToFirstMessage(props) {
    const guildid = props.guild_id !== null ? props.guild_id : "@me";
    const channelid = props.id;
    const url = `/channels/${guildid}/${channelid}/0`;
    NavigationRouter.transitionTo(url);
}

const MenuPatch: NavContextMenuPatchCallback = (children, { channel }) => {
    children.push(
        <Menu.MenuItem
            id="vc-jump-to-first"
            label="اول رساله"
            action={() => {
                jumpToFirstMessage(channel);
            }}
        />
    );
};

export default definePlugin({
    name: "اول رساله",
    description: "اول رساله في اي شات حتى لو كان شات روم",
    authors[{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    contextMenus:
    {
        "channel-context": MenuPatch,
        "user-context": MenuPatch,
        "thread-context": MenuPatch
    }
});

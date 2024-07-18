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
            label="Jump To First Message"
            action={() => {
                jumpToFirstMessage(channel);
            }}
        />
    );
};

export default definePlugin({
    name: "JumpToStart",
    description: "Adds a context menu option to jump to the start of a channel/DM",
    authors: [Devs.Samwich],
    contextMenus:
    {
        "channel-context": MenuPatch,
        "user-context": MenuPatch,
        "thread-context": MenuPatch
    }
});

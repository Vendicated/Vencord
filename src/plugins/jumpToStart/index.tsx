/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, NavigationRouter } from "@webpack/common";

const MenuPatch: NavContextMenuPatchCallback = (children, { channel }) => {
    if (!channel) return;

    children.push(
        <Menu.MenuItem
            id="vc-jump-to-first"
            label="Jump To First Message"
            action={() => NavigationRouter.transitionTo(`/channels/${channel.guild_id ?? "@me"}/${channel.id}/0`)}
        />
    );
};

export default definePlugin({
    name: "JumpToStart",
    description: "Adds a context menu option to jump to the first message of channel/DM",
    tags: ["JumpToFirst", "FirstMessage"],
    authors: [Devs.Samwich],
    contextMenus: {
        "channel-context": MenuPatch,
        "user-context": MenuPatch,
        "thread-context": MenuPatch
    }
});

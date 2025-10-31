/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, NavigationRouter, RestAPI } from "@webpack/common";

function jumpToFirstMessage(props) {
    const guildid = props.guild_id !== null ? props.guild_id : "@me";
    const channelid = props.id;
    const url = `/channels/${guildid}/${channelid}/0`;
    NavigationRouter.transitionTo(url);
}

async function jumpToBottom(props) {
    const guildid = props.guild_id ?? "@me";
    const channelid = props.id;
    const res = await RestAPI.get({
        url: `/channels/${channelid}/messages?limit=1`
    });

    const lastMessageId = res.body?.[0]?.id;
    if (!lastMessageId) return;

    const url = `/channels/${guildid}/${channelid}/${lastMessageId}`;
    NavigationRouter.transitionTo(url);
}

const MenuPatch: NavContextMenuPatchCallback = (children, { channel }) => {
    children.push(
        <Menu.MenuItem
            id="vc-jump-to-first"
            label="Jump To First Message"
            action={() => jumpToFirstMessage(channel)}
        />,
        <Menu.MenuItem
            id="vc-jump-to-bottom"
            label="Jump To Bottom"
            action={() => jumpToBottom(channel)}
        />
    );
};

export default definePlugin({
    name: "JumpTo",
    description: "Adds context menu options to jump to the start or bottom of a channel/DM",
    authors: [Devs.Samwich, Devs.thororen],
    contextMenus: {
        "channel-context": MenuPatch,
        "user-context": MenuPatch,
        "thread-context": MenuPatch
    }
});

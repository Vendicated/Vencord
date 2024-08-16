/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findExportedComponentLazy } from "@webpack";
import { ChannelStore, Menu, NavigationRouter } from "@webpack/common";

const HeaderBarIcon = findExportedComponentLazy("Icon", "Divider");

function JumpToStart(channel) {
    NavigationRouter.transitionTo(`/channels/${channel.guild_id ?? "@me"}/${channel.id}/0`);
}

const MenuPatch: NavContextMenuPatchCallback = (children, { channel }) => {
    if (!channel) return;

    children.push(
        <Menu.MenuItem
            id="vc-jump-to-first"
            label="Jump To First Message"
            action={() => JumpToStart(channel)}
        />
    );
};

function JumpToStartIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 384 512">
            <path fill="currentColor" d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.3l105.4 105.3c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"/>
        </svg>
    );
}

function headerButton({ channelId, channelType }) {
    if(!channelId || channelType !== 11) return;

    const channel = ChannelStore.getChannel(channelId);

    if(!channel) return;

    return (
        <HeaderBarIcon
            className="vc-jumptostart-btn"
            onClick={() => JumpToStart(channel)}
            tooltip={"Jump To Thread Start"}
            icon={() => JumpToStartIcon()}
            selected={true}
        />
    );
}

export default definePlugin({
    name: "JumpToStart",
    description: "Adds a context menu option to jump to the first message of channel/DM",
    tags: ["JumpToFirst", "FirstMessage"],
    authors: [Devs.Samwich],
    contextMenus: {
        "channel-context": MenuPatch,
        "user-context": MenuPatch,
        "thread-context": MenuPatch
    },
    headerButton: ErrorBoundary.wrap(headerButton),
    patches: [
        {
            find: "toolbar:function",
            replacement:
            {
                match: /let{isAuthenticated:/,
                replace: "if(Array.isArray(arguments[0]?.toolbar))arguments[0].toolbar.unshift($self.headerButton(arguments[0]));$&"
            }
        }
    ]
});

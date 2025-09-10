/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, ChannelStore, NavigationRouter, FluxDispatcher, MessageActions, MessageStore } from "@webpack/common";

interface ChannelSelectEvent {
    type: "CHANNEL_SELECT";
    channelId: string | null;
    guildId: string | null;
}

let lastChan = "0";

function jumpToPresent(channelId, { limit }: { limit?: number } = {}) {
    MessageActions.trackJump(channelId, null, "Present");

    const jump = { present: true };
    
    if (MessageStore.hasPresent(channelId)) {
        FluxDispatcher.dispatch({
            type: "LOAD_MESSAGES_SUCCESS_CACHED",
            jump,
            channelId,
            limit
        });
    } else {
        MessageActions.fetchMessages({
            channelId,
            limit,
            jump
        });
    }
}

function autoJump(channel: any) {
    const guildId = channel.guild_id ?? "@me";
    const channelId = channel.id;

    if (channelId === lastChan) return;

    NavigationRouter.transitionTo(`/channels/${guildId}/${channelId}`);
    lastChan = channelId;

    jumpToPresent(channelId, { limit: 100 });
}

const MenuPatch: NavContextMenuPatchCallback = (children, { channel }) => {
    children.push(
        <Menu.MenuItem
            id="auto-jump"
            label="Jump to Last Message"
            action={() => autoJump(channel)}
        />
    );
};

export default definePlugin({
    name: "AutoJump",
    description: "Automatically jumps to the last message in selected channel & adds a context-menu option to jump to the last message.",
    authors: [EquicordDevs.omaw],
    contextMenus: {
        "channel-context": MenuPatch,
        "user-context": MenuPatch,
        "thread-context": MenuPatch
    },
    flux: {
        async CHANNEL_SELECT({ guildId, channelId }: ChannelSelectEvent) {
            if (!guildId || !channelId) return;
            const channel = ChannelStore.getChannel(channelId);
            if (!channel || lastChan === channel.id) return;
            autoJump(channel);
        }
    }
});

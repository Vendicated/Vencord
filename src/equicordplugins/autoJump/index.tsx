/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Menu, MessageActions, NavigationRouter } from "@webpack/common";

interface ChannelSelectEvent {
    type: "CHANNEL_SELECT";
    channelId: string | null;
    guildId: string | null;
}

let lastChannelId = "0";

function autoJump({ guild_id, id: channelId }) {
    const guildId = guild_id ?? "@me";

    lastChannelId = channelId;
    NavigationRouter.transitionTo(`/channels/${guildId}/${channelId}`);
    MessageActions.jumpToPresent(channelId, { limit: null });
}

const MenuPatch: NavContextMenuPatchCallback = (children, { channel }) => {
    children.push(
        <Menu.MenuItem
            id="auto-jump"
            label="Jump to Last Message"
            action={() => {
                autoJump(channel);
            }}
        />
    );
};

const settings = definePluginSettings({
    autoJumping: {
        type: OptionType.BOOLEAN,
        description: "Automatically jump to the last message in the channel when switching channels",
        default: false
    }
});

export default definePlugin({
    name: "AutoJump",
    description: "Jumps to Last Message in Channel",
    authors: [EquicordDevs.omaw],
    settings,
    contextMenus: {
        "channel-context": MenuPatch,
        "user-context": MenuPatch,
        "thread-context": MenuPatch
    },
    flux: {
        async CHANNEL_SELECT({ guildId, channelId }: ChannelSelectEvent) {
            if (!settings.store.autoJumping || !channelId) return;

            const channel = ChannelStore.getChannel(channelId);
            if (!channel || channel.id === lastChannelId) return;

            autoJump({ guild_id: guildId, id: channelId });
        }
    }
});

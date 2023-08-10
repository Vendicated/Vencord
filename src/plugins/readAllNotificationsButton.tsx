/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Button, FluxDispatcher, GuildChannelStore, GuildStore, React, ReadStateStore } from "@webpack/common";

function onClick() {
    const channels: Array<any> = [];

    Object.values(GuildStore.getGuilds()).forEach(guild => {
        GuildChannelStore.getChannels(guild.id).SELECTABLE.forEach((c: { channel: { id: string; }; }) => {
            if (!ReadStateStore.hasUnread(c.channel.id)) return;

            channels.push({
                channelId: c.channel.id,
                // messageId: c.channel?.lastMessageId,
                messageId: ReadStateStore.lastMessageId(c.channel.id),
                readStateType: 0
            });
        });
    });

    FluxDispatcher.dispatch({
        type: "BULK_ACK",
        context: "APP",
        channels: channels
    });
}

const ReadAllButton = () => (
    <Button
        onClick={onClick}
        size={Button.Sizes.MIN}
        color={Button.Colors.BRAND}
        style={{ marginTop: "2px", marginBottom: "8px", marginLeft: "9px" }}
    >Read all</Button>
);

export default definePlugin({
    name: "ReadAllNotificationsButton",
    description: "Read all server notifications with a single button click!",
    authors: [Devs.kemo],
    dependencies: ["ServerListAPI"],

    renderReadAllButton: () => <ReadAllButton />,

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderReadAllButton);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderReadAllButton);
    }
});

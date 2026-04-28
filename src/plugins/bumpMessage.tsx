/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Eggrror404
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { sendMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import { ChannelStore, Menu } from "@webpack/common";

function BumpIcon() {
    return (
        <svg role="img" width="18" height="18" viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M15 20H9v-8H4.16L12 4.16L19.84 12H15v8Z"
            />
        </svg>
    );
}

function convertMessage(message: string) {
    return "> " + message.replaceAll("\n", "\n> ");
}

const patchMessageContextMenu: NavContextMenuPatchCallback = (
    children,
    props,
) => {
    const { message } = props;
    const { content, channel_id, id: message_id } = message;
    const { guild_id } = ChannelStore.getChannel(channel_id);

    if (!content) return;

    children.push(<Menu.MenuSeparator />);
    children.push(
        <Menu.MenuItem
            id="bm-bump-message"
            key="bm-bump-message"
            label="نسخ و رد"
            action={() => {
                console.log(message);
                sendMessage(
                    channel_id,
                    { content: convertMessage(content) },
                    void 0,
                    { messageReference: { guild_id, channel_id, message_id } },
                );
            }}
            icon={BumpIcon}
        />,
    );
};

export default definePlugin({
    name: "BumpMessage",
    description: "Bump a message with a simple menu click يرد و يرسال نفس الرساله لراعيها",
    authors: [Devs.rz30],
    contextMenus: {
        message: patchMessageContextMenu,
    },
});

/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButtonFactory, removeChatBarButton } from "@api/ChatButtons";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Menu } from "@webpack/common";

import { saveMessage } from "./data";
import { openSavedMessagesModal } from "./SavedMessagesModal";
import "./style.css";

async function handleSaveMessage(message: Message) {
    const channel = ChannelStore.getChannel(message.channel_id);

    await saveMessage({
        messageId: message.id,
        channelId: message.channel_id,
        guildId: channel?.guild_id,
        authorId: message.author.id,
        authorName: message.author.username,
        authorAvatar: message.author.getAvatarURL(channel?.guild_id, 64, false),
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        savedAt: new Date().toISOString(),
    });
}

const SAVE_MESSAGE_ID = "vc-save-message";

const patchMessageContextMenu: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!message?.id) return;

    children.push(
        <Menu.MenuItem
            id={SAVE_MESSAGE_ID}
            key={SAVE_MESSAGE_ID}
            label="Save Message"
            action={() => handleSaveMessage(message)}
        />
    );
};

const ChatBarIcon: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <button
            className="vc-saved-messages-chatbar-btn"
            aria-label="Saved Messages"
            onClick={openSavedMessagesModal}
        >
            📌
        </button>
    );
};

export default definePlugin({
    name: "SavedMessages",
    description: "Save messages locally via the message context menu, and view them later from a Saved Messages panel.",
    authors: [Devs.Ven],
    dependencies: ["ChatInputButtonAPI"],

    contextMenus: {
        message: patchMessageContextMenu,
    },

    start() {
        addChatBarButton("SavedMessages", ChatBarIcon);
    },

    stop() {
        removeChatBarButton("SavedMessages");
    },
});

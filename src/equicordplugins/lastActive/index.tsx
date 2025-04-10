/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, MessageActions, MessageStore, NavigationRouter, Toasts, UserStore } from "@webpack/common";

async function findLastMessageFromUser(channelId: string, userId: string) {
    try {
        const messageCollection = MessageStore.getMessages(channelId);
        let messages = messageCollection?.toArray() || [];
        let userMessage = messages.filter(m => m?.author?.id === userId).pop();
        if (userMessage) return userMessage.id;
        try {
            await MessageActions.fetchMessages({
                channelId: channelId,
                limit: 50
            });

            const updatedCollection = MessageStore.getMessages(channelId);
            messages = updatedCollection?.toArray() || [];
            userMessage = messages.filter(m => m?.author?.id === userId).pop();

            if (userMessage) return userMessage.id;
        } catch (fetchError) {
            console.error("Error fetching messages:", fetchError);
        }

        Toasts.show({
            type: Toasts.Type.FAILURE,
            message: "Couldn't find any recent messages from this user.",
            id: Toasts.genId()
        });
        return null;
    } catch (error) {
        console.error("Error finding last message:", error);
        Toasts.show({
            type: Toasts.Type.FAILURE,
            message: "Failed to find messages. Check console for details.",
            id: Toasts.genId()
        });
        return null;
    }
}
async function jumpToLastActive(channel: any, targetUserId?: string) {
    try {
        if (!channel) {
            Toasts.show({
                type: Toasts.Type.FAILURE,
                message: "Channel information not available.",
                id: Toasts.genId()
            });
            return;
        }
        const guildId = channel.guild_id !== null ? channel.guild_id : "@me";
        const channelId = channel.id;
        let userId: string;
        if (targetUserId) {

            userId = targetUserId;
        } else {
            const currentUser = UserStore.getCurrentUser();
            userId = currentUser.id;
        }
        const messageId = await findLastMessageFromUser(channelId, userId);
        if (messageId) {
            const url = `/channels/${guildId}/${channelId}/${messageId}`;
            NavigationRouter.transitionTo(url);
        }
    } catch (error) {
        console.error("Error in jumpToLastActive:", error);
        Toasts.show({
            type: Toasts.Type.FAILURE,
            message: "Failed to jump to message. Check console for details.",
            id: Toasts.genId()
        });
    }
}
const ChannelContextMenuPatch: NavContextMenuPatchCallback = (children, { channel }) => {
    children.push(
        <Menu.MenuItem
            id="LastActive"
            label={<span style={{ color: "green" }}>Jump to Your Last Message</span>}
            action={() => {
                jumpToLastActive(channel);
            }}
        />
    );
};
const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user, channel }) => {
    if (!channel || !user?.id) return;

    children.push(
        <Menu.MenuItem
            id="LastActive"
            label={<span style={{ color: "green" }}>Jump to User's Last Message</span>}
            action={() => {
                jumpToLastActive(channel, user.id);
            }}
        />
    );
};
export default definePlugin({
    name: "LastActive",
    description: "A plugin to jump to last active message from yourself or another user in a channel/server.",
    authors: [EquicordDevs.Crxa],
    contextMenus: {
        "channel-context": ChannelContextMenuPatch,
        "user-context": UserContextMenuPatch,
        "thread-context": ChannelContextMenuPatch
    }
});

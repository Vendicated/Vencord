/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, NavigationRouter, RestAPI, Toasts, UserStore } from "@webpack/common";

async function findLastMessageFromUser(guildId: string, channelId: string, userId: string) {
    try {
        const res = await RestAPI.get({
            url: `/guilds/${guildId}/messages/search?author_id=${userId}&channel_id=${channelId}&sort_by=timestamp&sort_order=desc&offset=0`
        });

        const allMessages = res.body.messages?.flat() || [];
        const newestMessage = allMessages.find(msg => msg && msg.id);

        if (newestMessage) return newestMessage.id;

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
        const messageId = await findLastMessageFromUser(guildId, channelId, userId);
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
            label={<span style={{ color: "#aa6746" }}>Your Last Message</span>}
            icon={LastActiveIcon}
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
            label={<span style={{ color: "#aa6746" }}>User's Last Message</span>}
            icon={UserLastActiveIcon}
            action={() => {
                jumpToLastActive(channel, user.id);
            }}
        />
    );
};

export function UserLastActiveIcon() {
    return (
        <svg
            viewBox="0 0 52 52"
            width="20"
            height="20"
            fill="#aa6746"
        >
            <g>
                <path d="M11.4,21.6L24.9,7.9c0.6-0.6,1.6-0.6,2.2,0l13.5,13.7c0.6,0.6,0.6,1.6,0,2.2L38.4,26
                c-0.6,0.6-1.6,0.6-2.2,0l-9.1-9.4c-0.6-0.6-1.6-0.6-2.2,0l-9.1,9.3c-0.6,0.6-1.6,0.6-2.2,0l-2.2-2.2C10.9,23.1,10.9,22.2,11.4,21.6
                z"/>
                <path d="M11.4,39.7L24.9,26c0.6-0.6,1.6-0.6,2.2,0l13.5,13.7c0.6,0.6,0.6,1.6,0,2.2l-2.2,2.2
                c-0.6,0.6-1.6,0.6-2.2,0l-9.1-9.4c-0.6-0.6-1.6-0.6-2.2,0L15.8,44c-0.6,0.6-1.6,0.6-2.2,0l-2.2-2.2C10.9,41.2,10.9,40.2,11.4,39.7z
                "/>
            </g>
        </svg>
    );
}

export function LastActiveIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="#aa6746"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path fillRule="evenodd" d="M12,2 C17.5228475,2 22,6.4771525 22,12 C22,17.5228475 17.5228475,22 12,22 C6.4771525,22 2,17.5228475 2,12 C2,6.4771525 6.4771525,2 12,2 Z M12,4 C7.581722,4 4,7.581722 4,12 C4,16.418278 7.581722,20 12,20 C16.418278,20 20,16.418278 20,12 C20,7.581722 16.418278,4 12,4 Z M12,6 C12.5128358,6 12.9355072,6.38604019 12.9932723,6.88337887 L13,7 L13,11.5857864 L14.7071068,13.2928932 C15.0976311,13.6834175 15.0976311,14.3165825 14.7071068,14.7071068 C14.3466228,15.0675907 13.7793918,15.0953203 13.3871006,14.7902954 L13.2928932,14.7071068 L11.2928932,12.7071068 C11.1366129,12.5508265 11.0374017,12.3481451 11.0086724,12.131444 L11,12 L11,7 C11,6.44771525 11.4477153,6 12,6 Z" />
        </svg>
    );
}

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

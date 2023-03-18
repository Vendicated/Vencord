/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByCode, findByCodeLazy, findLazy } from "@webpack";
import { ChannelStore, Menu, SelectedChannelStore } from "@webpack/common";
import { Message } from "discord-types/general";

const ReplyIcon = LazyComponent(() => findByCode("M10 8.26667V4L3 11.4667L10 18.9333V14.56C15 14.56 18.5 16.2667 21 20C20 14.6667 17 9.33333 10 8.26667Z"));

// for people who speak different languages
const i18n = findLazy(m => m.Messages?.MESSAGE_ACTION_REPLY);

const replyFn = findByCodeLazy("showMentionToggle", "TEXTAREA_FOCUS", "shiftKey");

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, args) => {
    if (!args?.[0]) return;
    const [{ message }] = args as [{ message: Message; }];

    // make sure they are in the same channel as the message
    if (!message || SelectedChannelStore.getChannelId() !== (message.channel_id ?? message.getChannelId())) return;

    const channel = ChannelStore.getChannel(message.channel_id ?? message.getChannelId());

    if (!channel) return;

    // dms and group chats
    const dmGroup = findGroupChildrenByChildId("pin", children);
    if (dmGroup && !dmGroup.some(child => child?.props?.id === "reply")) {
        const pinIndex = dmGroup.findIndex(c => c.props.id === "pin");
        return dmGroup.splice(pinIndex + 1, 0, (
            <Menu.MenuItem
                id="reply"
                label={i18n.Messages.MESSAGE_ACTION_REPLY}
                icon={ReplyIcon}
                action={(e: React.MouseEvent) => replyFn(channel, message, e)}
            />
        ));
    }

    // servers
    const serverGroup = findGroupChildrenByChildId("mark-unread", children);
    if (serverGroup && !serverGroup.some(child => child?.props?.id === "reply")) {
        return serverGroup.unshift((
            <Menu.MenuItem
                id="reply"
                label={i18n.Messages.MESSAGE_ACTION_REPLY}
                icon={ReplyIcon}
                action={(e: React.MouseEvent) => replyFn(channel, message, e)}
            />
        ));
    }

};


export default definePlugin({
    name: "SearchReply",
    description: "Adds a reply button to search results",
    authors: [Devs.Aria],

    start() {
        addContextMenuPatch("message", messageContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("message", messageContextMenuPatch);
    }
});



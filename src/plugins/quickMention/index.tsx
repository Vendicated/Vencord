/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { addButton, removeButton } from "@api/MessagePopover";
import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin from "@utils/types";
import { ChannelStore, Permissions, PermissionStore } from "@webpack/common";

export default definePlugin({
    name: "QuickMention",
    authors: [Devs.kemo],
    description: "Adds a quick mention button to the message actions bar",
    dependencies: ["MessagePopoverAPI"],

    start() {
        addButton("QuickMention", message => {
            const channel = ChannelStore.getChannel(message.channel_id)!;
            if (!channel.isPrivate() && !PermissionStore.can(Permissions.SEND_MESSAGES, channel))
                return null;

            return {
                label: "Quick Mention",
                icon: this.Icon,
                message,
                channel,
                onClick() { insertTextIntoChatInputBox(`<@${message.author.id}> `); }
            };
        });
    },
    stop() {
        removeButton("QuickMention");
    },

    Icon: () => (
        <svg
            className="icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path
                d="M12 2C6.486 2 2 6.486 2 12c0 5.515 4.486 10 10 10 2.039 0 3.993-.602 5.652-1.741l-1.131-1.648C15.195 19.519 13.633 20 12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8v.782C20 14.17 19.402 15 18.4 15l-.002.018c-.06-.013-.125-.018-.189-.018H18c-.563 0-1.4-.818-1.4-1.369V12c0-2.536-2.063-4.6-4.6-4.6-2.537 0-4.6 2.063-4.6 4.6 0 2.537 2.063 4.6 4.6 4.6 1.234 0 2.35-.494 3.177-1.287C15.826 16.269 16.93 17 18 17l.002-.019c.062.013.127.019.193.019h.205c2.152 0 3.6-1.694 3.6-4.218V12c0-5.514-4.486-10-10-10Zm0 12.599c-1.434 0-2.6-1.166-2.6-2.6 0-1.434 1.166-2.6 2.6-2.6 1.434 0 2.6 1.166 2.6 2.6 0 1.434-1.166 2.6-2.6 2.6Z"
            />
        </svg>
    ),
});

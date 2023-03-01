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

import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByCode, findByCodeLazy, findLazy } from "@webpack";
import { ChannelStore, Menu, SelectedChannelStore } from "@webpack/common";
import type { Message } from "discord-types/general";

const ReplyIcon = LazyComponent(() => findByCode("M10 8.26667V4L3 11.4667L10 18.9333V14.56C15 14.56 18.5 16.2667 21 20C20 14.6667 17 9.33333 10 8.26667Z"));

// for people who speak different languages
const i18n = findLazy(m => m.Messages?.MESSAGE_ACTION_REPLY);

const replyFn = findByCodeLazy("showMentionToggle", "TEXTAREA_FOCUS", "shiftKey");

export default definePlugin({
    name: "SearchReply",
    description: "Adds a reply button to search results",
    authors: [Devs.Aria],
    patches: [
        {
            find: 'navId:"message",onClose:',
            replacement: {
                match: /(function \i\(\i\){.{1,100}message.{1,100}onSelect(.|\n){1,1000}{children:)\[(?<items>.{1,50})\]/,
                replace: "$1[$self.makeMenu(arguments[0]),$<items>]"
            }
        }
    ],


    makeMenu({ message }: { message: Message; }) {
        if (!message || SelectedChannelStore.getChannelId() !== (message.channel_id ?? message.getChannelId())) return;

        const channel = ChannelStore.getChannel(message.channel_id ?? message.getChannelId());

        if (!channel) return;
        return (
            <Menu.MenuItem
                id="reply"
                label={i18n.Messages.MESSAGE_ACTION_REPLY}
                icon={ReplyIcon}
                action={(e: React.MouseEvent) => replyFn(channel, message, e)}
            />
        );

    }
});

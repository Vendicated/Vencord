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

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants.js";
import definePlugin from "@utils/types";
import { ChannelStore } from "@webpack/common";
import Message from "discord-types/general/Message.js";

import { ChannelsTabsContainer } from "./components";
import { ChannelTabsUtils } from "./util.js";

export default definePlugin({
    name: "ChannelTabs",
    description: "Group your commonly visited channels in tabs, like a browser",
    authors: [Devs.TheSun],
    patches: [
        // add the channel tab container at the top
        {
            find: ".LOADING_DID_YOU_KNOW",
            replacement: {
                match: /(===(\i)\?void 0:\i\.channelId\).{0,130})Fragment,{children:(\(0,\i\.jsxs\)\("div",{.{0,500}sidebarTheme:.{0,1000}\.CHANNEL_THREAD_VIEW\(.{0,1500}\(0,\i\.jsx\)\(.{0,100}\)]}\))/,
                replace: "$1Fragment,{children:[$self.render($2),$3]"
            }
        },
        // ctrl click to open in new tab in inbox
        {
            find: ".messageContainer,onKeyDown",
            replacement: {
                match: /onJump:function\(\i\){(return \i\((\i),(\i).id)/,
                replace: "onJump:function($2){ if($2.ctrlKey) return $self.open($3);$1"
            }
        },
        // ctrl click to open in new tab in search results
        {
            find: ".searchResultFocusRing",
            replacement: {
                match: /jumpTo=function\((\i)\){.{0,100}(\i)=\i\.result.{0,50}\)\);/,
                replace: "$&if($1.ctrlKey) return $self.open($2);"
            }
        }
    ],

    render(props) {
        return <ErrorBoundary>
            <ChannelsTabsContainer {...props} />
        </ErrorBoundary>;
    },

    open(message: Message) {
        const tab = {
            channelId: message.channel_id,
            guildId: ChannelStore.getChannel(message.channel_id)?.guild_id
        };
        ChannelTabsUtils.createTab(tab, message.id);
    },

    // TODO: remove
    util: ChannelTabsUtils
});

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

import { ChannelsTabsContainer } from "./components";
import { ChannelTabsUtils } from "./util.js";

export default definePlugin({
    name: "ChannelTabs",
    description: "Group your commonly visited channels in tabs, like a browser",
    authors: [Devs.TheSun],
    patches: [{
        find: ".LOADING_DID_YOU_KNOW",
        replacement: {
            match: /(===(\i)\?void 0:\i\.channelId\).{0,130})Fragment,{children:(\(0,\i\.jsxs\)\("div",{.{0,500}sidebarTheme:.{0,1000}\.CHANNEL_THREAD_VIEW\(.{0,1500}\(0,\i\.jsx\)\(.{0,100}\)]}\))/,
            replace: "$1Fragment,{children:[$self.render($2),$3]"
        }
    }],

    render(props) {
        return <ErrorBoundary>
            <ChannelsTabsContainer {...props} />
        </ErrorBoundary>;
    },

    // TODO: remove
    util: ChannelTabsUtils
});

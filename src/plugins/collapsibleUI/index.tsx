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

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByCode } from "@webpack";

import { ServersWrapper, ToggleServersButton } from "./servers";

// const ChannelsIcon = LazyComponent(() => findByCode("M1.25 0.5H4.25C4.66475 0.5 5"));

export const HeaderBarIcon = LazyComponent(() => findByCode(".HEADER_BAR_BADGE,", ".tooltip"));

function ToolbarButtons() {
    return (
        <>
            <ToggleServersButton />
            {/* <ToggleChannelsButton /> */}
        </>
    );
}

export const settings = definePluginSettings({
    reveal: {
        type: OptionType.BOOLEAN,
        description: "Reveal hidden sidebars",
        default: true
    },
    servers: {
        type: OptionType.BOOLEAN,
        description: "Internal servers state",
        default: true,
        hidden: true
    }
});

export default definePlugin({
    name: "CollapsibleUI",
    description: "Remove or shrink parts of the UI",
    authors: [Devs.TheKodeToad],
    settings,
    patches: [
        // add buttons
        {
            find: ".renderHeaderToolbar=function(){",
            replacement: [
                {
                    match: /(\i\.isArchivedThread\(\)\|\|)?(\i)\.push\(\(0,\i\.jsx\)\(\i,{channelId:\i\.id},"members"\)\);/g,
                    replace: "$2.push($self.ToolbarButtons());$&"
                },
                {
                    match: /(\i).push\(\(0,\i.jsx\)\(\i,{channel:\i,showCall:\i},"profile"\)\);/,
                    replace: "$1.push($self.ToolbarButtons());$&"
                }
            ]
        },
        // TODO: add buttons next to invite in vc
        // {
        // 	find: ".DM_CHANNEL},\"invite-button\"))}",
        // 	replacement: {
        // 		match: /"invite-button"\)\)(?<=(\i)\.push\(\(0.+?)/,
        // 		replace: "$&;$1.push($self.toolbarButtons())"
        // 	}
        // },
        // add style to server sidebar
        // {
        //     find: "().guilds,themeOverride:",
        //     replacement: [
        //         {
        //             match: /(return\(0,\i\.jsx\)\(\i\.Fragment,{children:\(0,\i.jsxs\)\("div\",{className:\i\(\)\.container,children:\[\i&&\(0,\i\.jsx\)\(\i\.\i,{className:)(\i\(\)\.guilds)/,
        //             replace: "const serversVisible=$self.useServers();const reveal=$self.useLeftReveal();$1[$2,serversVisible||\"vc-collapsed\",!serversVisible&&reveal&&\"vc-collapsed-reveal\",\"vc-guilds\"]"
        //         },
        //         {
        //             match: /(return \i\?null:\(0,\i\.jsxs\)\("div",{className:)(\i\(\)\(\i\(\)\.sidebar,\(0,\i\.\i\)\(\i\),\(\i={},\i\(\i,\i\(\)\.hasNotice,t\),\i\(\i,\i\(\)\.fullWidth,\i\.\i\),\i\(\i,\i\(\)\.hidden,a\),i\)\))/,
        //             replace: "const channelsVisible=$self.useChannels();const reveal=$self.useLeftReveal();$1[$2,channelsVisible||\"vc-collapsed\",!channelsVisible&&reveal&&\"vc-collapsed-reveal\"].filter(Boolean).join(\" \")"
        //         }
        //     ]
        // }
        {
            find: ".CHANNEL(\":guildId\",\":channelId?\",\":messageId?\")])",
            replacement: {
                match: /\(0,\i\.jsx\)\((\i\.\i),(\{className:\i\(\)\.guilds,themeOverride:n})\)/,
                replace: "$self.ServersWrapper({Component:$1,props:$2})"
            }
        }
    ],
    ToolbarButtons,
    ServersWrapper
});

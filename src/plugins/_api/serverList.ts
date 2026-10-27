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

import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ServerListAPI",
    authors: [Devs.kemo, EquicordDevs.Etorix],
    description: "API required for plugins that modify the server list.",
    isModified: true,

    patches: [
        {
            // Exports Discord's guildless item for the shared server-list component.
            find: '="DOWNLOAD_APPS";function',
            replacement: {
                match: /(?<=\i\.\i\(\i,\{)(?=\i:\(\)=>\i.{0,30000}?let (\i)=function\(\i\)\{let\{ref:)/,
                replace: "GuildlessServerListItemComponent:()=>$1,"
            }
        },
        {
            find: "#{intl::DISCODO_DISABLED}",
            replacement: {
                match: /(?<=#{intl::DISCODO_DISABLED}.+?return)(\(.{0,150}?tutorialId:"friends-list".+?}\))(?=}function)/,
                replace: "[$1].concat(Vencord.Api.ServerList.renderAll(Vencord.Api.ServerList.ServerListRenderPosition.Above))"
            }
        },
        {
            find: ".setGuildsTree(",
            replacement: [
                {
                    match: /(?<=#{intl::SERVERS}\),gap:"xs",children:)\i\.map\(.{0,50}\.length\)/,
                    replace: "Vencord.Api.ServerList.renderAll(Vencord.Api.ServerList.ServerListRenderPosition.In).concat($&)"
                },
                {
                    match: /lastTargetNode.{0,25}\?null:\i,/,
                    replace: "$&...Vencord.Api.ServerList.renderAll(Vencord.Api.ServerList.ServerListRenderPosition.Below),"
                }
            ]
        }
    ]
});

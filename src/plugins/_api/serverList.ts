/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ServerListAPI",
    authors: [Devs.kemo],
    description: "Api required for plugins that modify the server list",
    patches: [
        {
            find: "#{intl::DISCODO_DISABLED}",
            replacement: {
                match: /(?<=#{intl::DISCODO_DISABLED}.+?return)(\(.{0,75}?tutorialContainer.+?}\))(?=}function)/,
                replace: "[$1].concat(Vencord.Api.ServerList.renderAll(Vencord.Api.ServerList.ServerListRenderPosition.Above))"
            }
        },
        {
            find: ".setGuildsTree(",
            replacement: {
                match: /(?<=#{intl::SERVERS}\),gap:"xs",children:)\i\.map\(.{0,50}\.length\)/,
                replace: "Vencord.Api.ServerList.renderAll(Vencord.Api.ServerList.ServerListRenderPosition.In).concat($&)"
            }
        }
    ]
});

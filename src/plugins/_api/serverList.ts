/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
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
            find: "Messages.DISCODO_DISABLED",
            replacement: {
                match: /(Messages\.DISCODO_DISABLED\);return)(.*?homeIcon.*?)(\}function)/,
                replace: "$1[$2].concat(Vencord.Api.ServerList.renderAll(Vencord.Api.ServerList.ServerListRenderPosition.Above))$3"
            }
        },
        {
            find: "Messages.SERVERS,children",
            replacement: {
                match: /(Messages\.SERVERS,children:)(.+?default:return null\}\}\)\))/,
                replace: "$1Vencord.Api.ServerList.renderAll(Vencord.Api.ServerList.ServerListRenderPosition.In).concat($2)"
            }
        }
    ]
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ContextMenuAPI",
    description: "API for adding/removing items to/from context menus.",
    authors: [Devs.Nuckyz, Devs.Ven],
    required: true,

    patches: [
        {
            find: "♫ (つ｡◕‿‿◕｡)つ ♪",
            replacement: {
                match: /(?<=function \i\((\i)\){)(?=var \i,\i=\i\.navId)/,
                replace: (_, props) => `Vencord.Api.ContextMenu._patchContextMenu(${props});`
            }
        },
        {
            find: ".Menu,{",
            all: true,
            replacement: {
                match: /Menu,{(?<=\.jsxs?\)\(\i\.Menu,{)/g,
                replace: "$&contextMenuApiArguments:typeof arguments!=='undefined'?arguments:[],"
            }
        }
    ]
});

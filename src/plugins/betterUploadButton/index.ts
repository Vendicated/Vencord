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
    name: "BetterUploadButton",
    authors: [Devs.fawn, Devs.Ven],
    description: "Upload with a single click, open menu with right click",
    patches: [
        {
            find: ".CHAT_INPUT_BUTTON_NOTIFICATION,",
            replacement: [
                {
                    match: /onClick:(\i\?void 0:\i)(?=,onDoubleClick:(\i\?void 0:\i),)/,
                    replace: "$&,...$self.getOverrides(arguments[0],$1,$2)",
                },
            ]
        },
    ],

    getOverrides(props: any, onClick: any, onDoubleClick: any) {
        if (!props?.className?.includes("attachButton")) return {};

        return {
            onClick: onDoubleClick,
            onContextMenu: onClick
        };
    }
});

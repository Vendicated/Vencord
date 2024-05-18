/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoModalAnimation",
    description: "Remove the 300ms long animation when opening or closing modals",
    authors: [Devs.AutumnVN],
    patches: [
        {
            find: ".rootWithShadow",
            replacement: {
                match: /\?300:100/,
                replace: "?0:0",
            }
        },
        {
            find: "BackdropStyles:function(){",
            replacement: {
                match: /\?0:300/,
                replace: "?0:0",
            }
        }
    ]
});

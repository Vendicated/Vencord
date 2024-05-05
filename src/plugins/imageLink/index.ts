/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ImageLink",
    description: "Never hide image links in messages, even if it's the only content",
    authors: [Devs.Kyuuhachi],

    patches: [
        {
            find: "isEmbedInline:function()",
            replacement: {
                match: /(?<=isEmbedInline:function\(\)\{return )\i(?=\})/,
                replace: "()=>false",
            },
        },
    ],
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ImageLink",
    description: "Suppresses the hiding of links for \"simple embeds\"",
    authors: [Devs.Kyuuhachi],

    patches: [
        {
            find: "isEmbedInline:function",
            replacement: {
                match: /(?<=isEmbedInline:function\(\)\{return )\w+(?=\})/,
                replace: "()=>false",
            },
        },
    ],
});

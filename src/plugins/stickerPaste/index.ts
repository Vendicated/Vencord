/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "StickerPaste",
    description: "Makes picking a sticker in the sticker picker insert it into the chatbox instead of instantly sending",
    tags: ["Emotes", "Chat"],
    authors: [Devs.ImBanana],

    patches: [
        {
            // This function is a util func from another module
            // but it only has once use here so it's inlined
            find: '.STICKER_PICKER:return""',
            replacement: {
                match: /(?<=\){)if\(\i\.\i\.getUploadCount/,
                replace: "return true;$&",
            }
        }
    ]
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "StickerPaste",
    description: "When picking a sticker, it inserts it into the chatbox instead of sending it instantly.",
    authors: [Devs.ImBanana],

    patches: [{
        find: ".stickers,previewSticker:",
        replacement: {
            match: /(if\(.{1,5}\.getUploadCount)/,
            replace: "return true;$1",
        }
    }]
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants.js";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoMaskUrlPaste",
    authors: [Devs.CatNoir],
    description: "Pasting a link while having text selected will not paste a hyperlink.",
    patches: [
        {
            find: ".selection,preventEmojiSurrogates:",
            replacement: {
                match: /if\(null!=\i.selection&&\i.M8.isExpanded\(e.selection\)\)/,
                replace: "if(false)"
            }
        }
    ],
});

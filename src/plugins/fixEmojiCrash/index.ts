/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "FixEmojiCrash",
    authors: [Devs.AutumnVN],
    description: "Fix emoji has name 'default' causing crash",
    patches: [
        {
            find: "getTermsForEmoji:function",
            replacement: {
                match: /getTermsForEmoji:function\((\i)\){/,
                replace: "$& if ($1 === 'default') return [];"
            }
        }]
});

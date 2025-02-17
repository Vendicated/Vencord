/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "MarkdownAPI",
    description: "API to add/mod discord markdown rules",
    authors: [Devs.iamme],
    patches: [
        {
            find: "{RULES:",
            replacement: {
                match: /{RULES:[^}]+}/,
                replace: "Vencord.Api.Markdown.patchMarkdownRules($&)"
            }
        },
        {
            find: "type:\"verbatim\"",
            replacement: {
                match: /let (\i)=({link:.*,after:""}})/,
                replace: "let $1=Vencord.Api.Markdown.patchSlateRules($2)"
            }
        }
    ]
});

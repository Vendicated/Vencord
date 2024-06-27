/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";


export default definePlugin({
    name: "MarkdownRulesAPI",
    description: "API to add/mod markdown rules",
    authors: [Devs.iamme],
    patches: [
        {
            find: "{RULES:",
            replacement: {
                match: /{RULES:[^}]+}/,
                replace: "Vencord.Api.MarkdownRules.patchMarkdownRules($&)"
            }
        },
        {
            find: "type:\"verbatim\"",
            replacement: {
                match: /let (\i)=({link:.*,after:""}})/,
                replace: "let $1=Vencord.Api.MarkdownRules.insertSlateRules($2)"
            }
        }
    ],
    startAt: StartAt.Init
});

/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "MarkdownAPI",
    description: "API to add markdown rules",
    authors: [Devs.Cyn],
    patches: [
        {
            find: '"then you probably need to add it to this file so that the rich chat box understands it."',
            replacement: [
                {
                    match: /(\.RULES\){if\(!\(\i in \i\))(\)throw.+?=)(\i\[(\i)\]);/,
                    replace: "$1&&!Vencord.Api.Markdown.__getSlateRule($4)$2$3??Vencord.Api.Markdown.__getSlateRule($4);",
                },
                {
                    match: /=(\i)\.originalMatch;(.+?case"emoticon":(return .+?;).+?case"link":(.+?))(?=default:)/,
                    replace: (_, rule, orig, plaintextReturn, inlineStyleBody) => `=${rule}.originalMatch;if(${rule}.type.startsWith("vc_")){if(Vencord.Api.Markdown.__getSlateRule(${rule}.type)?.type==="inlineStyle"){${inlineStyleBody}}else{${plaintextReturn}}}${orig}`,
                },
            ]
        },
        {
            find: '"Slate: Unknown decoration attribute: "',
            replacement: {
                match: /return\[\i\[(\i)\]\];/,
                replace: "$&const vc_slateDecorator=Vencord.Api.Markdown.__getSlateDecorator($1);if(vc_slateDecorator!=null)return[vc_slateDecorator];"
            },
        },
    ],
});

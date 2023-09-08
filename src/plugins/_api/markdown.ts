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

const inlineStylePatch = new RegExp(('=\\i\\[("link"===\\i\\?"url":\\i)\\];').replaceAll("\\i", "[A-Za-z_$][\\w$]*"));

export default definePlugin({
    name: "MarkdownAPI",
    description: "API to add markdown rules",
    authors: [Devs.Cyn],
    patches: [
        {
            find: '"then you probably need to add it to this file so that the rich chat box understands it."',
            replacement: [
                {
                    match: /(?<=originalMatch:\i}}}},\i=(\(0,\i\.\i\))\(\[(\i),(\i)\]\),\i=\(0,\i\.\i\)\(\[(\i),\i\]\),(\i)=(\i.\i)\(\i\),(\i)=.{0,160},guildId:\i}),(\i)=(\i)\?\i:\i,/,
                    replace: (_, flatten, rules, slateOverrides, inlineRules, rulesParser, astParserFor, inlineParser, parser, inline) => `;const vc_rules=Vencord.Api.Markdown.__getCustomRules();var ${parser}=${inline}?(${inlineParser}=${astParserFor}(${flatten}([${inlineRules},${slateOverrides},vc_rules]))):(${rulesParser}=${astParserFor}(${flatten}([${rules},${slateOverrides},vc_rules]))),`,
                },
                {
                    match: /=(\i)\.originalMatch;(.{0,160}case"emoticon":(return .+?;).{0,1100}case"link":(.{0,420}))(?=default:)/,
                    replace: (_, rule, orig, plaintextReturn, inlineStyleBody) => `=${rule}.originalMatch;if(${rule}.type.startsWith("vc_")){if(Vencord.Api.Markdown.__getSlateRule(${rule}.type)?.type==="inlineStyle"){${inlineStyleBody.replace(inlineStylePatch, "=Vencord.Api.Markdown.__getSlateRule($1);")}}else{${plaintextReturn}}}${orig}`,
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

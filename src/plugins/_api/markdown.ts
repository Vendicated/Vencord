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
                // grab slate rules
                {
                    match: /(?<=,\i={};)(for\(var \i in \i\.\i\.RULES\){if\(!\(\i in (\i)\)\))/,
                    replace: (_, ruleParserLoop, rules) => `Vencord.Api.Markdown.__setSlateRules(${rules});${ruleParserLoop}`,
                },

                // grab slate overrides
                {
                    match: /,(\i=\(0,\i\.\i\)\(\[\i,(\i)]\),)/,
                    replace: (_, parser, rules) => `;Vencord.Api.Markdown.__setSlateOverrides(${rules});var ${parser}`,
                },

                // replace parsers with ones with new rules
                {
                    match: /(?<=,guildId:\i}),(\i)=(\i)\?\i:\i,/,
                    replace: (_, parser, inline) => `;const vc_parsers=Vencord.Api.Markdown.__getSlateParsers();var ${parser}=${inline}?vc_parsers.inline:vc_parsers.normal,`,
                },

                // patch into rule parsing
                {
                    match: /=(\i)\.originalMatch;(.{0,160}case"emoticon":(return .+?;).{0,1100}case"link":(.{0,420}))(?=default:)/,
                    replace: (_, rule, orig, plaintextReturn, inlineStyleBody) => `=${rule}.originalMatch;if(${rule}.type.startsWith("vc_")){if(Vencord.Api.Markdown.__getSlateRule(${rule}.type)?.type==="inlineStyle"){${inlineStyleBody.replace(inlineStylePatch, "=Vencord.Api.Markdown.__getSlateRule($1);")}}else{${plaintextReturn}}}${orig}`,
                },
            ]
        },

        // add new decorators
        {
            find: '"Slate: Unknown decoration attribute: "',
            replacement: {
                match: /return\[\i\[(\i)\]\];/,
                replace: "$&const vc_slateDecorator=Vencord.Api.Markdown.__getSlateDecorator($1);if(vc_slateDecorator!=null)return[vc_slateDecorator];"
            },
        },
    ],
});

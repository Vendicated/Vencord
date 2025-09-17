/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { CompactPronounsChatComponentWrapper, PronounsChatComponentWrapper } from "./PronounsChatComponent";
import { settings } from "./settings";

migratePluginSettings("UserMessagesPronouns", "PronounDB");
export default definePlugin({
    name: "UserMessagesPronouns",
    authors: [Devs.Tyman, Devs.TheKodeToad, Devs.Ven, Devs.Elvyra],
    description: "Adds pronouns to chat user messages",
    settings,

    patches: [
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                // Add next to timestamp (normal mode)
                match: /(?<=return\s*\(0,\i\.jsxs?\)\(.+!\i&&)(\(0,\i.jsxs?\)\(.+?\{.+?\}\))/,
                replace: "[$1, $self.PronounsChatComponentWrapper(arguments[0])]"
            }
        },
        {
            find: '="SYSTEM_TAG"',
            replacement: [
                {
                    // Add next to username (compact mode)
                    // FIXME(Bundler spread transform related): Remove old compatiblity once enough time has passed, if they don't revert
                    match: /className:\i\(\)\(\i\.className(?:,\i\.clickable)?,\i\)}\),(?=\i)/g,
                    replace: "$&$self.CompactPronounsChatComponentWrapper(arguments[0]),",
                    noWarn: true
                },
                {
                    // Add next to username (compact mode)
                    match: /className:\i\(\)\(\i\.className(?:,\i\.clickable)?,\i\)}\)\),(?=\i)/g,
                    replace: "$&$self.CompactPronounsChatComponentWrapper(arguments[0]),",
                },
            ]
        }
    ],

    PronounsChatComponentWrapper,
    CompactPronounsChatComponentWrapper,
});

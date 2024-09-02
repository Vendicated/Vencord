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

import "./styles.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import PronounsAboutComponent from "./components/PronounsAboutComponent";
import { CompactPronounsChatComponentWrapper, PronounsChatComponentWrapper } from "./components/PronounsChatComponent";
import { useProfilePronouns } from "./pronoundbUtils";
import { settings } from "./settings";

export default definePlugin({
    name: "PronounDB",
    authors: [Devs.Tyman, Devs.TheKodeToad, Devs.Ven, Devs.Elvyra],
    description: "Adds pronouns to user messages using pronoundb",
    patches: [
        {
            find: "showCommunicationDisabledStyles",
            replacement: [
                // Add next to username (compact mode)
                {
                    match: /("span",{id:\i,className:\i,children:\i}\))/,
                    replace: "$1, $self.CompactPronounsChatComponentWrapper(arguments[0])"
                },
                // Patch the chat timestamp element (normal mode)
                {
                    match: /(?<=return\s*\(0,\i\.jsxs?\)\(.+!\i&&)(\(0,\i.jsxs?\)\(.+?\{.+?\}\))/,
                    replace: "[$1, $self.PronounsChatComponentWrapper(arguments[0])]"
                }
            ]
        },

        {
            find: ".Messages.USER_PROFILE_PRONOUNS",
            group: true,
            replacement: [
                {
                    match: /\.PANEL},/,
                    replace: "$&[vcPronoun,vcPronounSource,vcHasPendingPronouns]=$self.useProfilePronouns(arguments[0].user?.id),"
                },
                {
                    match: /text:\i\.\i.Messages.USER_PROFILE_PRONOUNS/,
                    replace: '$&+(vcHasPendingPronouns?"":` (${vcPronounSource})`)'
                },
                {
                    match: /(\.pronounsText.+?children:)(\i)/,
                    replace: "$1vcHasPendingPronouns?$2:vcPronoun"
                }
            ]
        }
    ],

    settings,

    settingsAboutComponent: PronounsAboutComponent,

    // Re-export the components on the plugin object so it is easily accessible in patches
    PronounsChatComponentWrapper,
    CompactPronounsChatComponentWrapper,
    useProfilePronouns
});

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

const PRONOUN_TOOLTIP_PATCH = {
    match: /text:(.{0,10}.Messages\.USER_PROFILE_PRONOUNS)(?=,)/,
    replace: '$& + (typeof vcPronounSource !== "undefined" ? ` (${vcPronounSource})` : "")'
};

export default definePlugin({
    name: "PronounDB",
    authors: [Devs.Tyman, Devs.TheKodeToad, Devs.Ven],
    description: "Adds pronouns to user messages using pronoundb",
    patches: [
        // Add next to username (compact mode)
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /("span",{id:\i,className:\i,children:\i}\))/,
                replace: "$1, $self.CompactPronounsChatComponentWrapper(e)"
            }
        },
        // Patch the chat timestamp element (normal mode)
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /(?<=return\s*\(0,\i\.jsxs?\)\(.+!\i&&)(\(0,\i.jsxs?\)\(.+?\{.+?\}\))/,
                replace: "[$1, $self.PronounsChatComponentWrapper(e)]"
            }
        },
        // Patch the profile popout username header to use our pronoun hook instead of Discord's pronouns
        {
            find: ".userTagNoNickname",
            replacement: [
                {
                    match: /,(\i)=(\i)\.pronouns/,
                    replace: ",[$1,vcPronounSource]=$self.useProfilePronouns($2.user.id)"
                },
                PRONOUN_TOOLTIP_PATCH
            ]
        },
        // Patch the profile modal username header to use our pronoun hook instead of Discord's pronouns
        {
            find: ".USER_PROFILE_ACTIVITY",
            replacement: [
                {
                    match: /\.getName\(\i\);(?<=displayProfile.{0,200})/,
                    replace: "$&const [vcPronounce,vcPronounSource]=$self.useProfilePronouns(arguments[0].user.id,true);if(arguments[0].displayProfile&&vcPronounce)arguments[0].displayProfile.pronouns=vcPronounce;"
                },
                PRONOUN_TOOLTIP_PATCH
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

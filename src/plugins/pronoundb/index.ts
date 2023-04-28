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
            replacement: {
                match: /=(\i)\.pronouns/,
                replace: "=$self.useProfilePronouns($1.user.id)"
            }
        },
        // Patch the profile modal username header to use our pronoun hook instead of Discord's pronouns
        {
            find: ".USER_PROFILE_ACTIVITY",
            replacement: {
                match: /\).showPronouns/,
                replace: ").showPronouns||true;if(arguments[0].displayProfile)arguments[0].displayProfile.pronouns=$self.useProfilePronouns(arguments[0].user.id)"
            }
        }
    ],

    settings,

    settingsAboutComponent: PronounsAboutComponent,

    // Re-export the components on the plugin object so it is easily accessible in patches
    PronounsChatComponentWrapper,
    CompactPronounsChatComponentWrapper,
    useProfilePronouns
});

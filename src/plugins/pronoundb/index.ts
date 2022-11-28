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

import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import PronounsAboutComponent from "./components/PronounsAboutComponent";
import PronounsChatComponent from "./components/PronounsChatComponent";
import PronounsProfileWrapper from "./components/PronounsProfileWrapper";

export enum PronounsFormat {
    Lowercase = "LOWERCASE",
    Capitalized = "CAPITALIZED"
}

export default definePlugin({
    name: "PronounDB",
    authors: [Devs.Tyman],
    description: "Adds pronouns to user messages using pronoundb",
    patches: [
        // Patch the chat timestamp element
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /(?<=return\s*\(0,\w{1,3}\.jsxs?\)\(.+!\w{1,3}&&)(\(0,\w{1,3}.jsxs?\)\(.+?\{.+?\}\))/,
                replace: "[$1, Vencord.Plugins.plugins.PronounDB.PronounsChatComponent(e)]"
            }
        },
        // Hijack the discord pronouns section (hidden without experiment) and add a wrapper around the text section
        {
            find: "currentPronouns:",
            all: true,
            noWarn: true,
            replacement: {
                match: /\(0,.{1,3}\.jsxs?\)\((.{1,10}),(\{[^[}]*currentPronouns:[^}]*(\w)\.pronouns[^}]*\})\)/,
                replace: (original, PronounComponent, pronounProps, fullProps) => {
                    // UserSettings
                    if (pronounProps.includes("onPronounsChange")) return original;

                    return `${fullProps}&&Vencord.Plugins.plugins.PronounDB.PronounsProfileWrapper(${PronounComponent}, ${pronounProps}, ${fullProps})`;
                }
            }
        },
        // Make pronouns experiment be enabled by default
        {
            find: "2022-01_pronouns",
            replacement: {
                match: "!1", // false
                replace: "!0"
            }
        }
    ],

    options: {
        pronounsFormat: {
            type: OptionType.SELECT,
            description: "The format for pronouns to appear in chat",
            options: [
                {
                    label: "Lowercase",
                    value: PronounsFormat.Lowercase,
                    default: true
                },
                {
                    label: "Capitalized",
                    value: PronounsFormat.Capitalized
                }
            ]
        },
        showSelf: {
            type: OptionType.BOOLEAN,
            description: "Enable or disable showing pronouns for the current user",
            default: true
        }
    },
    settingsAboutComponent: PronounsAboutComponent,
    // Re-export the components on the plugin object so it is easily accessible in patches
    PronounsChatComponent,
    PronounsProfileWrapper
});

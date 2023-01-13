/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022-2023 Vendicated and contributors
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

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import PronounsAboutComponent from "./components/PronounsAboutComponent";
import PronounsChatComponent from "./components/PronounsChatComponent";
import PronounsProfileWrapper from "./components/PronounsProfileWrapper";
import { formatPronouns, getLocalPronounOverride, setLocalPronounOverride } from "./pronoundbUtils";
import { PronounCode, PronounMapping } from "./types";

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
            find: ".Messages.BOT_PROFILE_SLASH_COMMANDS",
            replacement: {
                match: /\(0,.\.jsx\)\((?<PronounComponent>.{1,2}\..),(?<pronounProps>{currentPronouns.+?:(?<fullProps>.{1,2})\.pronouns.+?})\)/,
                replace: "$<fullProps>&&Vencord.Plugins.plugins.PronounDB.PronounsProfileWrapper($<PronounComponent>,$<pronounProps>,$<fullProps>)"
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

    commands: [
        {
            description: "Set local pronouns for a person",
            name: "setpronouns",
            options: [
                {
                    description: "The user for which you want to set the local pronoun override",
                    name: "user",
                    displayName: "User",
                    type: ApplicationCommandOptionType.USER,
                    required: true,
                },
                {
                    name: "pronouns",
                    displayName: "Pronouns",
                    type: ApplicationCommandOptionType.STRING,
                    description: "What pronouns should I display for this user.",
                    required: false,
                    choices: [
                        ...Object.keys(PronounMapping).map(id => ({
                            label: PronounMapping[id],
                            value: id,
                            name: PronounMapping[id],
                        })),
                        {
                            label: "Clear local override",
                            name: "Clear local override",
                            value: "clear",
                        }
                    ],
                }
            ],
            inputType: ApplicationCommandInputType.BOT,
            async execute(args, ctx) {
                const user = findOption<string>(args, "user")!!;
                const overrideWith = findOption<string>(args, "pronouns", "view");
                const currentOverride = await getLocalPronounOverride(user);
                const currentOverrideText = currentOverride ? formatPronouns(currentOverride) : "No override";
                if (overrideWith === "view") {
                    sendBotMessage(ctx.channel.id, { content: `Current pronoun override for <@${user}>: ${currentOverrideText}` });
                    return;
                }
                if (overrideWith !== currentOverride) {
                    const asPronounCode = overrideWith === "clear" ? null : overrideWith as PronounCode;
                    await setLocalPronounOverride(user, asPronounCode);
                    sendBotMessage(ctx.channel.id, { content: `Changed pronoun override for <@${user}> from ${currentOverrideText} to ${asPronounCode ? formatPronouns(asPronounCode) : "No override"}` });
                    return;
                }
                sendBotMessage(ctx.channel.id, { content: `Pronoun override for <@${user}> is alredy ${currentOverrideText}` });
            },
        },
    ],

    settingsAboutComponent: PronounsAboutComponent,
    // Re-export the components on the plugin object so it is easily accessible in patches
    PronounsChatComponent,
    PronounsProfileWrapper
});

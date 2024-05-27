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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import presetQuotesText from "file://quotes.txt";

const presetQuotes = presetQuotesText.split("\n").map(quote => /^\s*[^#\s]/.test(quote) && quote.trim()).filter(Boolean) as string[];
const noQuotesQuote = "Did you really disable all loading quotes? What a buffoon you are...";

const settings = definePluginSettings({
    replaceEvents: {
        description: "This plugin affects events (e.g. Halloween)",
        type: OptionType.BOOLEAN,
        default: true
    },
    enablePluginPresetQuotes: {
        description: "Enable the quotes preset by this plugin",
        type: OptionType.BOOLEAN,
        default: true
    },
    enableDiscordPresetQuotes: {
        description: "Enable Discord's preset quotes (including event quotes, during events)",
        type: OptionType.BOOLEAN,
        default: false
    },
    additionalQuotes: {
        description: "Additional custom quotes to possibly appear",
        type: OptionType.STRING,
        default: "",
    },
    additionalQuotesDelimiter: {
        description: "Delimiter for additional quotes",
        type: OptionType.STRING,
        default: "|",
    },
});

export default definePlugin({
    name: "LoadingQuotes",
    description: "Replace Discords loading quotes",
    authors: [Devs.Ven, Devs.KraXen72, Devs.UlyssesZhan],

    settings,

    patches: [
        {
            find: ".LOADING_DID_YOU_KNOW",
            replacement: [
                {
                    match: /return (.{0,200}?),?((\i)\[.{1,10}?\.random)/,
                    replace: "$1; $3 = $self.quotes($3); return $2"
                },
                {
                    match: /(?<="_eventLoadingText",function.{10,200}?)return ((\i)\[.{1,30}?\])/,
                    replace: "{ $2 = $self.quotes($2); return $1 }",
                    predicate: () => settings.store.replaceEvents
                }
            ]
        },
    ],

    quotes(preset: string[]) {
        const result: string[] = settings.store.enableDiscordPresetQuotes ? preset : [];
        if (settings.store.enablePluginPresetQuotes) {
            result.push(...presetQuotes);
        }
        result.push(...settings.store.additionalQuotes.split(settings.store.additionalQuotesDelimiter).filter(Boolean));
        return result.length > 0 ? result : [noQuotesQuote];
    }
});

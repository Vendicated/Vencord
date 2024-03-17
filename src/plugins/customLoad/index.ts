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

// These are Xor encrypted to prevent you from spoiling yourself when you read the source code.
// don't worry about it :P

const settings = definePluginSettings({
    replaceEvents: {
        description: "Replace Event Quotes too",
        type: OptionType.BOOLEAN,
        default: true
    },
    replacementText: {
        type: OptionType.STRING,
        description: "Replacement text (use the format)",
            default: '"optionOne", "optionTwo"',
        onChange: onChange,
        isValid: (value: string) => {
            if (!value) return "String is required.";
            return true;
    }
});

const quotes = [
   replacementText
];

export default definePlugin({
    name: "CustomQuotes",
    description: "Replace Discords loading quotes",
    authors: [Devs.Ven, Devs.KraXen72, Devs.Frigid],

    settings,

    patches: [
        {
            find: ".LOADING_DID_YOU_KNOW}",
            replacement: [
                {
                    match: /\._loadingText=function\(\)\{/,
                    replace: "$&return $self.quote;",
                },
                {
                    match: /\._eventLoadingText=function\(\)\{/,
                    replace: "$&return $self.quote;",
                    predicate: () => settings.store.replaceEvents
                }
            ],
        },
    ],

    xor(quote: string) {
        const key = "read if cute";
        const codes = Array.from(quote, (s, i) => s.charCodeAt(0) ^ (i % key.length));
        return String.fromCharCode(...codes);
    },

    get quote() {
        return this.xor(quotes[Math.floor(Math.random() * quotes.length)]);
    }
});

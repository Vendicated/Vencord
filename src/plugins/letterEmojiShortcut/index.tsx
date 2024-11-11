/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";

const EmojiLib = findByPropsLazy("getByName", "getCategories", "getDefaultDiversitySurrogate", "convertNameToSurrogate");

/* old method of just adding emojis
   may have better compatibility? keeping for future refrence
{
    find: "\"raised_hand_with_part_between_middle_and_ring_fingers\"",
    replacement: {
        match: /"regional_indicator_([a-z])"/g,
        replace: "$&,\"$1$1\""
    }
}
*/

const alphabet = [..."abcdefghijklmnopqrstuvwxyz"];
const doubleMatch = /^([a-zA-Z])\1?$/;

const settings = definePluginSettings({
    autocomplete: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Makes e.g. :b: and :bb: suggest 🇧 as the first option (only inserted on tab-complete, simply typing :bb: will not work)",
        restartNeeded: false
    },
    alias: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Makes e.g. :bb: alias to 🇧. This makes just typing :bb: work (and it sends the real 🇧), but has the side effect of rendering the plaintext of :bb: as an emoji.",
        restartNeeded: false
    },
    allLetters: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Makes :ltr:/:letter:/:letters: autocomplete to all regional indicators.",
        restartNeeded: false
    }
});

export default definePlugin({
    name: "LetterEmojiShortcut",
    description: "Adds shortcuts for typing the blue letter emojis",
    authors: [Devs.UnmatchedBracket],
    settings,
    patches: [
        {
            find: /searchWithoutFetchingLatest\(\i\){/,
            replacement: {
                match: /searchWithoutFetchingLatest\((\i)\){(.*?unlocked:)(this.getSearchResultsOrder.*?),locked/,
                replace: "searchWithoutFetchingLatest($1){$2$self.addEmojiToList($3, $1),locked"
            }
        },
        {
            find: "getDefaultDiversitySurrogate:function()",
            replacement: {
                match: /convertNameToSurrogate:(\i),/,
                replace: "convertNameToSurrogate:$self.surrogatePatch($1),"
            }
        }
    ],
    addEmojiToList(list: Object[], query: { query: string; }) {
        if (Vencord.Settings.plugins.LetterEmojiShortcut.autocomplete) {
            let match = doubleMatch.exec(query.query);
            if (match) {
                let emoji = EmojiLib.getByName("regional_indicator_" + match[1]);
                if (emoji) {
                    list = list.filter(x => x != emoji);
                    list.unshift(emoji);
                }
            }
        }
        if (Vencord.Settings.plugins.LetterEmojiShortcut.allLetters
            && (query.query == "ltr" || query.query == "letter" || query.query == "letters")) {
            list.unshift(...alphabet.map(l => EmojiLib.getByName("regional_indicator_" + l)));
        }

        return list;
    },
    surrogatePatch(original: Function) {
        return (name: string, default_: string | undefined) => {
            if (!Vencord.Settings.plugins.LetterEmojiShortcut.alias)
                return original(name, default_);

            let match = doubleMatch.exec(name);
            if (match) {
                default_ = original("regional_indicator_" + match[1], default_);
            }
            let ret = original(name, default_);
            return ret;
        };
    }
});

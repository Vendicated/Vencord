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

import { Emoji } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";

const EmojiStore = findStoreLazy("EmojiStore");

interface EmojiAutocompleteState {
    query?: {
        type: string;
        typeInfo: {
            sentinel: string;
        };
        results: {
            emojis: Emoji[];
        };
    };
}

export default definePlugin({
    name: "FavoriteEmojiFirst",
    authors: [Devs.Aria],
    description: "Puts your favorite emoji first in the emoji autocomplete.",
    patches: [
        {
            find: ".activeCommandOption",
            replacement: {
                match: /\(\(function\(.{1,15}\){.{1,400}(?<stateVar>\i)=\i\[0\].{1,200}selectedIndex\);/,
                replace: "$&$self.sortEmojis($<stateVar>);"
            }
        }
    ],

    sortEmojis(state: EmojiAutocompleteState) {
        if (
            || state.query?.type !== "EMOJIS_AND_STICKERS"
            || state.query.typeInfo?.sentinel !== ":"
            || !state.query.results?.emojis?.length
        ) return;

        const emojiContext = EmojiStore.getDisambiguatedEmojiContext();

        state.query.results.emojis.sort((a: Emoji, b: Emoji) => {
            const aIsFavorite = emojiContext.isFavoriteEmojiWithoutFetchingLatest(a);
            const bIsFavorite = emojiContext.isFavoriteEmojiWithoutFetchingLatest(b);

            if (aIsFavorite && !bIsFavorite) return -1;

            if (!aIsFavorite && bIsFavorite) return 1;

            return 0;
        });
    }
});

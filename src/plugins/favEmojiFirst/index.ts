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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { EmojiStore } from "@webpack/common";
import { Emoji } from "@webpack/types";

interface EmojiAutocompleteState {
    query?: {
        type: string;
        typeInfo: {
            sentinel: string;
        };
        results: {
            emojis: Emoji[] & { sliceTo?: number; };
        };
    };
}

export default definePlugin({
    name: "FavoriteEmojiFirst",
    authors: [Devs.Aria, Devs.Ven],
    description: "Puts your favorite emoji first in the emoji autocomplete.",
    patches: [
        {
            find: "renderResults({results:",
            replacement: [
                {
                    // https://regex101.com/r/N7kpLM/1
                    match: /let \i=.{1,100}renderResults\({results:(\i)\.query\.results,/,
                    replace: "$self.sortEmojis($1);$&"
                },
            ],
        },

        {
            find: "numLockedEmojiResults:",
            replacement: [
                // set maxCount to Infinity so our sortEmojis callback gets the entire list, not just the first 10
                // and remove Discord's emojiResult slice, storing the endIndex on the array for us to use later
                {
                    // https://regex101.com/r/x2mobQ/1
                    // searchEmojis(...,maxCount: stuff) ... endEmojis = emojis.slice(0, maxCount - gifResults.length)
                    match: /,maxCount:(\i)(.{1,500}\i)=(\i)\.slice\(0,(Math\.max\(\i,\i(?:-\i\.length){2}\))\)/,
                    // ,maxCount:Infinity ... endEmojis = (emojis.sliceTo = n, emojis)
                    replace: ",maxCount:Infinity$2=($3.sliceTo = $4, $3)"
                }
            ]
        }
    ],

    sortEmojis({ query }: EmojiAutocompleteState) {
        if (
            query?.type !== "EMOJIS_AND_STICKERS"
            || query.typeInfo?.sentinel !== ":"
            || !query.results?.emojis?.length
        ) return;

        const emojiContext = EmojiStore.getDisambiguatedEmojiContext();

        query.results.emojis = query.results.emojis.sort((a, b) => {
            const aIsFavorite = emojiContext.isFavoriteEmojiWithoutFetchingLatest(a);
            const bIsFavorite = emojiContext.isFavoriteEmojiWithoutFetchingLatest(b);

            if (aIsFavorite && !bIsFavorite) return -1;

            if (!aIsFavorite && bIsFavorite) return 1;

            return 0;
        }).slice(0, query.results.emojis.sliceTo ?? Infinity);
    }
});

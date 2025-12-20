/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Emoji } from "@vencord/discord-types";
import { EmojiStore } from "@webpack/common";

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
            find: "numEmojiResults:",
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

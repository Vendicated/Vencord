/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { Channel, EmojiSearchOptions } from "@vencord/discord-types";
import { EmojiStore } from "@webpack/common";



interface AutocompleteInput {
    currentWord: string | null;
    parentAutocompleteInputType?: string | null;
}
interface EmojiTypeInfo {
    sentinel: string;
    queryResults(channel: Channel, guild: unknown, query: string, options: { emojiIntention: EmojiSearchOptions["intention"]; }): unknown;
    renderResults(props: { sentinel?: string; }): unknown;
}
interface AutocompleteMatch {
    type: string;
    typeInfo: EmojiTypeInfo;
    query: string;
}
type AutocompleteMatcher = (input: AutocompleteInput) => AutocompleteMatch | null;
const allowedPrefixes = "!$%&()*,-.;<=>?[]^_`{|}~";
const settings = definePluginSettings({
    prefix: {
        type: OptionType.STRING,
        description: "Character used to show emoji suggestions",
        default: ";",
        restartNeeded: true,
        isValid: value => typeof value === "string" && value.length === 1 && allowedPrefixes.includes(value)
            || "Enter one supported punctuation character (not :, @, #, /, or +)."
    },
    emojiSource: {
        type: OptionType.SELECT,
        description: "Choose which emojis appear in suggestions",
        options: [
            { label: "Favorite List", value: "favorites", default: true },
            { label: "Normal", value: "normal" }
        ]
    },
    disableDefaultPrefix: {
        type: OptionType.BOOLEAN,
        description: "Disable the default emoji prefix (:)",
        default: false
    }
}, {
    disableDefaultPrefix: {
        hidden() { return this.store.emojiSource === "normal"; }
    }
});
export default definePlugin({
    name: "CustomEmojiPrefix",
    description: "Autocomplete emojis with a custom prefix, customize emoji source with your favorite list.",
    authors: [Devs.Mashiro],
    tags: ["Emotes", "Chat"],
    settings,
    patches: [
        {
            find: '["+:","@","#",":","/"]',
            group: true,
            replacement: [
                {
                    match: /(\["\+:","@","#",":","\/")\]/,
                    replace: "$1,$self.getPrefix()]"
                },
                {
                    match: /for\(let (\i) of (\i)\)if\((\i)\.startsWith\(\1,(\i)\)\)return \3\.slice\(\4\)/,
                    replace: "for(let $1 of $2)if($3.startsWith($1,$4)&&($1!==$self.getPrefix()||$4===0||/\\s/.test($3[$4-1])))return $3.slice($4)"
                }
            ]
        },
        {
            find: "findMatchingAutocompleteType:()=>",
            replacement: {
                match: /findMatchingAutocompleteType:\(\)=>(\i)/,
                replace: "findMatchingAutocompleteType:()=>$self.wrapMatcher($1)"
            }
        },
        {
            find: "numEmojiResults:",
            group: true,
            replacement: [
                {
                    match: /renderResults\((\i)\)\{(?=let\{results:\{emojis:\i,stickers:)/,
                    replace: 'renderResults($1){const vcFavoriteSentinel=$1.sentinel??":";'
                },
                {
                    match: /sentinel:":"(?=,guild:null!=\i.guildId)/,
                    replace: "sentinel:vcFavoriteSentinel"
                },
                {
                    match: /getQuery:(\i)=>`:\$\{\1\}`/,
                    replace: "getQuery:$1=>`${vcFavoriteSentinel}${$1}`"
                }
            ]
        }
    ],
    getPrefix() {
        const { prefix } = settings.store;
        return typeof prefix === "string" && prefix.length === 1 && allowedPrefixes.includes(prefix) ? prefix : ";";
    },
    wrapMatcher(match: AutocompleteMatcher): AutocompleteMatcher {
        return input => {
            const word = input.currentWord;
            const prefix = this.getPrefix();
            if (input.parentAutocompleteInputType) return match(input);
            const normal = settings.store.emojiSource === "normal";
            if ((normal || settings.store.disableDefaultPrefix) && word?.startsWith(":")) {
                const nativeMatch = match(input);
                return nativeMatch?.type === "EMOJIS_AND_STICKERS" ? null : nativeMatch;
            }
            if (!word?.startsWith(prefix)) return match(input);
            const query = word.slice(prefix.length);
            const nativeMatch = match({ ...input, currentWord: normal ? `:${query}` : ":ab" });
            if (nativeMatch?.type !== "EMOJIS_AND_STICKERS") return match(input);
            const nativeTypeInfo = nativeMatch.typeInfo;
            const typeInfo = {
                ...nativeTypeInfo,
                sentinel: prefix,
                renderResults: props => nativeTypeInfo.renderResults({ ...props, sentinel: prefix })
            };
            if (normal) return { ...nativeMatch, typeInfo };
            return {
                ...nativeMatch,
                query: query.toLocaleLowerCase(),
                typeInfo: {
                    ...typeInfo,
                    queryResults(channel, guild, query, options) {
                        nativeTypeInfo.queryResults(channel, guild, query, options);
                        const context = EmojiStore.getDisambiguatedEmojiContext(channel.getGuildId());
                        const emojis = EmojiStore.searchWithoutFetchingLatest({
                            channel,
                            query,
                            count: 0,
                            intention: options.emojiIntention
                        }).unlocked.filter(emoji => context.isFavoriteEmojiWithoutFetchingLatest(emoji));

                        return {
                            results: { emojis, stickers: [], soundmoji: [] },
                            metadata: {
                                numEmojiResults: emojis.length,
                                numStickerResults: 0,
                                numSoundmojiResults: 0
                            }
                        };
                    }
                }
            };
        };
    }
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

type SearchToken = {
    match: string[];
    start: number;
    type: string;
    getFullMatch(): string;
};

type AutocompleteOptions = {
    query: string;
    maxResults: number;
};

type SearchAutocomplete = (options: AutocompleteOptions) => { text: string; }[];

type SearchFilter = {
    filterType: string;
    answerType: string;
    filterKey: string;
    queryKey: string;
    filterRegex: RegExp;
    answerRegex: RegExp;
    parse: (token: SearchToken) => unknown;
    getAutocompletions?: SearchAutocomplete;
};

type SearchRule = {
    regex: RegExp;
    componentType: string;
    key?: string;
    plainText?: string;
    follows?: string[];
    queryKey?: string;
    getAutocompletions?: SearchAutocomplete;
};

function makeFilter(
    name: string,
    key: string,
    answerRegex: RegExp,
    parse: (token: SearchToken) => unknown,
    getAutocompletions?: SearchAutocomplete
): SearchFilter {
    const filterKey = `${key}:`;

    return {
        filterType: `FILTER_${name}`,
        answerType: `ANSWER_${name}`,
        filterKey,
        queryKey: key.replace(/([A-Z])/g, "_$1").toLowerCase(),
        filterRegex: new RegExp(`^${filterKey}`, "i"),
        answerRegex,
        parse,
        getAutocompletions
    };
}

const parseTrimmed = (token: SearchToken) => token.getFullMatch().trim();
const parseBoolean = (token: SearchToken) => token.getFullMatch().trim() === "true";
const parseNumber = (token: SearchToken) => Number(token.getFullMatch().trim());

const booleanAutocomplete: SearchAutocomplete = () => [
    { text: "true" },
    { text: "false" }
];

function wordAutocomplete(values: string[]): SearchAutocomplete {
    return ({ query, maxResults }) =>
        values
            .filter(value => value.startsWith(query.toLowerCase()))
            .slice(0, maxResults)
            .map(text => ({ text }));
}

const BOOL_REGEX = /^\s*(true|false)/i;
const WORD_REGEX = /^\s*[^\s]+/;
const SLOP_REGEX = /^\s*(?:[0-9]|[1-9][0-9]|100)\b/; // 0-100
const ID_REGEX = /^\s*\d{17,20}\b/;

const customFilters: SearchFilter[] = [
    makeFilter("INCLUDE_NSFW", "includeNsfw", BOOL_REGEX, parseBoolean, booleanAutocomplete),
    makeFilter("REPLIED_TO_MESSAGE_ID", "repliedToMessageId", ID_REGEX, parseTrimmed),
    makeFilter("REPLIED_TO_USER_ID", "repliedToUserId", ID_REGEX, parseTrimmed),
    makeFilter("MENTIONS_ROLE_ID", "mentionsRoleId", ID_REGEX, parseTrimmed),
    makeFilter("MENTION_EVERYONE", "mentionEveryone", BOOL_REGEX, parseBoolean, booleanAutocomplete),
    makeFilter("EMBED_TYPE", "embedType", WORD_REGEX, parseTrimmed, wordAutocomplete([
        "image",
        "video",
        "gif",
        "sound",
        "article"
    ])),
    makeFilter("EMBED_PROVIDER", "embedProvider", WORD_REGEX, parseTrimmed),
    makeFilter("COMMAND_ID", "commandId", ID_REGEX, parseTrimmed),
    makeFilter("COMMAND_NAME", "commandName", WORD_REGEX, parseTrimmed),
    makeFilter("SLOP", "slop", SLOP_REGEX, parseNumber),
];

let lastResolvedFilter: SearchFilter | null = null;

export default definePlugin({
    name: "BetterSearch",
    authors: [Devs.theo],
    description: "Allows you to use search parameters that aren't integrated into the Discord client",

    patches: [
        {
            find: "queryKey:null",
            replacement: [
                {
                    match: /(\i)=\(null==\(\i=null!=\(\i=\i\.\i\[(\i)\]\)\?\i\.queryKey:null\)&&\(\i="content"\),\i\);/,
                    replace: "$&$1=$self.getCustomQueryKey($2)??$1;"
                },
                {
                    match: /(\i)\.add\((\i)\.getFullMatch\(\)\.trim\(\)\)/,
                    replace: "$1.add($self.getCustomFilterValue($2)??$2.getFullMatch().trim())"
                }
            ]
        },
        {
            find: "FILTER_AUTHOR_TYPE]:{regex:",
            replacement: {
                match: /(return\{)(\[\i\.\i\.FILTER_FROM\]:)/,
                replace: "$1...$self.getCustomRules(),$2"
            }
        }
    ],

    getCustomRules() {
        const rules: Record<string, SearchRule> = {};

        for (const filter of customFilters) {
            rules[filter.filterType] = {
                regex: filter.filterRegex,
                componentType: "FILTER",
                key: filter.filterKey,
                plainText: filter.filterKey.replace(/:$/, ""),
                getAutocompletions(options: AutocompleteOptions) {
                    return filter.getAutocompletions?.(options) ?? [];
                }
            };

            rules[filter.answerType] = {
                regex: filter.answerRegex,
                follows: [filter.filterType],
                componentType: "ANSWER",
                queryKey: filter.queryKey
            };
        }

        return rules;
    },

    getCustomQueryKey(answerType: string) {
        const filter = customFilters.find(f => f.answerType === answerType);
        if (filter) lastResolvedFilter = filter;
        return filter?.queryKey;
    },

    getCustomFilterValue(token: SearchToken) {
        const filter = lastResolvedFilter;
        lastResolvedFilter = null;
        return filter ? filter.parse(token) : null;
    }
});

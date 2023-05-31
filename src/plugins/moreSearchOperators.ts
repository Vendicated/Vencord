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
import definePlugin from "@utils/types";
import { SelectedChannelStore } from "@webpack/common";

interface SearchFilter {
    componentType: "FILTER";
    regex: RegExp;
    key: string;
    validator?: (match?: any) => boolean;
    getAutocompletions: (match?: string, serverId?: string, maxResults?: number) => { text: string; }[];
    _title: string;
    _options: string;
}

interface SearchAnswer {
    componentType: "ANSWER";
    regex: RegExp;
    validator: (match: any) => boolean;
    follows: string[];
    queryKey: string;
    mutable: boolean;
    _dataKey: string | number;
}

const makeOptions = (...options: string[]) => options.map(text => ({ text }));

const SearchOperators: Record<string, SearchFilter> = {
    FILTER_EMBED_TYPE: {
        componentType: "FILTER",
        regex: /embedType:/i,
        key: "embedType:",
        getAutocompletions: () => makeOptions("image", "video", "gifv", "article"),
        _title: "Embed type",
        _options: "type"
    },
    FILTER_FILE_NAME: {
        componentType: "FILTER",
        regex: /fileName:/i,
        key: "fileName:",
        getAutocompletions: () => [],
        _title: "File name",
        _options: "file name"
    },
    FILTER_FILE_TYPE: {
        componentType: "FILTER",
        regex: /fileType:/i,
        key: "fileType:",
        getAutocompletions: () => makeOptions("png", "jpg", "webp", "gif", "mp4", "txt", "js", "css", "zip"),
        _title: "File type",
        _options: "extension"
    },
};

const SearchAnswers: Record<string, SearchAnswer> = {
    ANSWER_EMBED_TYPE: {
        componentType: "ANSWER",
        regex: /\s*([^\s]+)/i,
        validator: function (match) {
            match.setData("embedType", match.getMatch(1));
            return true;
        },
        follows: ["FILTER_EMBED_TYPE"],
        queryKey: "embed_type",
        mutable: true,
        _dataKey: "embedType"
    },
    ANSWER_FILE_NAME: {
        componentType: "ANSWER",
        regex: /(?:\s*([^\s]+))/,
        validator(match) {
            match.setData("fileName", match.getMatch(1));
            return true;
        },
        follows: ["FILTER_FILE_NAME"],
        queryKey: "attachment_filename",
        mutable: true,
        _dataKey: "fileName"
    },
    ANSWER_FILE_TYPE: {
        componentType: "ANSWER",
        regex: /(?:\s*([^\s]+))/,
        validator(match) {
            match.setData("fileType", match.getMatch(1));
            return true;
        },
        follows: ["FILTER_FILE_TYPE"],
        queryKey: "attachment_extension",
        mutable: true,
        _dataKey: "fileType"
    },
};

function registerSearchOperators(originalOperators: Record<string, SearchFilter | SearchAnswer>) {
    Object.assign(originalOperators, SearchOperators, SearchAnswers);
}

// Makes all of the custom operators visible by default
function setAsVisible(originalOperators: Record<string, boolean>) {
    for (const name in SearchOperators) {
        originalOperators[name] = true; // null for hidden
    }
}

// Defines the text displayed above the list of autocompletions
function setHeaderText(originalOperators: Record<string, { titleText(): string; }>) {
    for (const [name, operator] of Object.entries(SearchOperators)) {
        originalOperators[name] = { titleText: () => operator._title };
    }
}

function getSearchType(searchQuery: { query: any, searchId: string; }): [id: string, type: "CHANNEL" | "GUILD"] {
    const { query, searchId } = searchQuery;
    if (searchId === "@favorites" || "embed_type" in query) {
        return [query.channel_id?.[0] ?? SelectedChannelStore.getChannelId(), "CHANNEL"];
    }
    return [searchId, "GUILD"];
}

export default definePlugin({
    name: "MoreSearchOperators",
    description: "Adds experimental search operators.",
    authors: [Devs.Davri],

    patches: [
        {
            find: "Messages.SEARCH_SHORTCUT",
            replacement: {
                match: /\i\((\i),\i\.\i\.ANSWER_PINNED/,
                replace: "$self.registerSearchOperators($1),$&"
            }
        },
        {
            find: "Messages.SEARCH_ANSWER_FROM",
            replacement: {
                match: /(?<=\i\.forEach\(\(function\((\i)\).{300,500})var (\i)=\i\[\i\];switch\(\i\)\{/,
                // Adds query parameters to the search url
                replace: "$&" + Object.entries(SearchAnswers).map(([k, v]) => `case "${k}":$2.add($1.getData("${v._dataKey}"));break;`).join("")
            }
        },
        {
            find: "Messages.SEARCH_ANSWER_FROM",
            replacement: {
                match: /function \i\(\i\)\{switch\(\i\)\{/,
                // Defines the example text next to the initial list of autocompletions
                replace: "$&" + Object.entries(SearchOperators).map(([k, v]) => `case "${k}":return "${v._options}";`).join("")
            }
        },
        {
            find: "Messages.SEARCH_GROUP_HEADER",
            replacement: {
                match: /\i\((\i),\i\.\i\.FILTER_HAS,\{titleText/,
                replace: "$self.setHeaderText($1),$&"
            }
        },
        {
            find: "displayName=\"SearchAutocompleteStore\"",
            replacement: {
                match: /\i\((\i),\i\.\i\.FILTER_PINNED,!0\),/,
                replace: "$self.setAsVisible($1),$&"
            }
        },
        {
            find: "displayName=\"SearchStore\"",
            replacement: {
                match: /(?<=SEARCH_START:function\((\i)\).{100,200})var (\i)=\i,(\i)=\i\.searchType;if\(\i===\i\.\i\)\{.{50,100}\}/,
                replace: "var [$2,$3]=$self.getSearchType($1);"
            }
        }
    ],

    searchOperators: SearchOperators,
    searchAnswers: SearchAnswers,
    registerSearchOperators,
    setAsVisible,
    setHeaderText,
    getSearchType
});

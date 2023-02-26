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

interface SearchFilter {
    componentType: "FILTER";
    regex: RegExp;
    key: string;
    validator: (match: any) => boolean;
    getAutocompletions: (match: any) => { text: string; }[];
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

const searchOperators: { [name: string]: SearchFilter; } = {
    FILTER_SORT_ORDER: {
        componentType: "FILTER",
        regex: /sortOrder:/i,
        key: "sortOrder:",
        validator: () => true,
        getAutocompletions: () => [{ text: "descending" }, { text: "ascending" }],
        _title: "Sort order",
        _options: "descending, ascending"
    },
    FILTER_SORT_BY: {
        componentType: "FILTER",
        regex: /sortBy:/i,
        key: "sortBy:",
        validator: () => true,
        getAutocompletions: () => [{ text: "relevance" }, { text: "timestamp" }],
        _title: "Sort by",
        _options: "relevance, timestamp"
    },
    FILTER_EMBED_TYPE: {
        componentType: "FILTER",
        regex: /embedType:/i,
        key: "embedType:",
        validator: () => true,
        getAutocompletions: () => [{ text: "image" }, { text: "video" }, { text: "gifv" }, { text: "article" }],
        _title: "Embed type",
        _options: "type"
    },
    FILTER_FILE_NAME: {
        componentType: "FILTER",
        regex: /fileName:/i,
        key: "fileName:",
        validator: () => true,
        getAutocompletions: () => [],
        _title: "File name",
        _options: "file name"
    },
    FILTER_FILE_TYPE: {
        componentType: "FILTER",
        regex: /fileType:/i,
        key: "fileType:",
        validator: () => true,
        getAutocompletions: () => [{ text: "png" }, { text: "jpg" }, { text: "webp" }, { text: "gif" }, { text: "mp4" }, { text: "txt" }, { text: "js" }, { text: "css" }, { text: "zip" }],
        _title: "File type",
        _options: "extension"
    },
};

const searchAnswers: { [name: string]: SearchAnswer; } = {
    ANSWER_SORT_ORDER: {
        componentType: "ANSWER",
        regex: /\s*(asc|desc)(?:ending)?/i,
        validator: function (match) {
            let value = match.getMatch(1);
            switch (value) {
                case "asc":
                    match.setData("sortOrder", "asc");
                    return true;
                case "desc":
                    match.setData("sortOrder", "desc");
                    return true;
                default:
                    return false;
            }
        },
        follows: ["FILTER_SORT_ORDER"],
        queryKey: "sort_order",
        mutable: true,
        _dataKey: "sortOrder"
    },
    ANSWER_SORT_BY: {
        componentType: "ANSWER",
        regex: /\s*(relevance|timestamp)/i,
        validator: function (match) {
            let value = match.getMatch(1);
            switch (value) {
                case "relevance":
                    match.setData("sortBy", "relevance");
                    return true;
                case "timestamp":
                    match.setData("sortBy", "timestamp");
                    return true;
                default:
                    return false;
            }
        },
        follows: ["FILTER_SORT_BY"],
        queryKey: "sort_by",
        mutable: true,
        _dataKey: "sortBy"
    },
    ANSWER_FILE_NAME: {
        componentType: "ANSWER",
        regex: /(?:\s*([^\s]+))/,
        validator: function (match) {
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
        validator: function (match) {
            match.setData("fileType", match.getMatch(1));
            return true;
        },
        follows: ["FILTER_FILE_TYPE"],
        queryKey: "attachment_extension",
        mutable: true,
        _dataKey: "fileType"
    },
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
};

export default definePlugin({
    name: "MoreSearchOperators",
    description: "Adds experimental search operators.",
    authors: [Devs.Davri],

    patches: [{
        find: "Messages.SEARCH_SHORTCUT",
        replacement: {
            match: /(.)\((.),.\..{1,3}\.ANSWER_PINNED/,
            replace: Object.keys(searchOperators).map(a => `$1($2,"${a}",$self.searchOperators.${a}),`).join("") + Object.keys(searchAnswers).map(a => `$1($2,"${a}",$self.searchAnswers.${a}),`).join("") + "$&"
        }
    }, {
        find: "Messages.SEARCH_ANSWER_FROM",
        replacement: {
            match: /var .=.\[.\];switch\(.\)\{/,
            replace: "$&" + Object.entries(searchAnswers).map(([k, v]) => `case "${k}":a.add(e.getData("${v['_dataKey']}"));break;`).join("")
        }
    },
    {
        find: "Messages.SEARCH_ANSWER_FROM",
        replacement: {
            match: /function .\(.\)\{switch\(.\)\{/,
            replace: "$&" + Object.entries(searchOperators).map(([k, v]) => `case \"${k}\":return \"${v['_options']}\";`).join("")
        }
    },
    {
        find: "Messages.SEARCH_GROUP_HEADER",
        replacement: {
            match: /(.{2})\((.{2}),.\..{3}\.FILTER_HAS,\{titleText:function\(\)\{return .\..\.Messages.SEARCH_GROUP_HEADER_HAS\}\}\)/,
            replace: Object.entries(searchOperators).map(([k, v]) => `$1($2,\"${k}\",{titleText:()=>\"${v['_title']}\"}),`).join("") + "$&"
        }
    },
    {
        find: "displayName=\"SearchAutocompleteStore\"",
        replacement: {
            match: /(.{2})\((.),.\..{3}\.FILTER_PINNED,!0\),/,
            replace: "$&" + Object.keys(searchOperators).map(k => `$1($2,"${k}",true),`).join("")
        }
    }],

    searchOperators,
    searchAnswers
});
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

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { useCallback, useEffect, useState } from "@webpack/common";

interface SearchBarComponentProps {
    autoFocus: boolean;
    className: string;
    size: string;
    onChange: (query: string) => void;
    onClear: () => void;
    query: string;
    placeholder: string;
}

type TSearchBarComponent =
    React.FC<SearchBarComponentProps> & { Sizes: Record<"SMALL" | "MEDIUM" | "LARGE", string>; };

interface Gif {
    format: number;
    src: string;
    width: number;
    height: number;
    order: number;
    url: string;
}

interface Instance {
    dead?: boolean;
    state: {
        resultType?: string;
    };
    props: {
        favCopy: Gif[],

        favorites: Gif[],
    },
    forceUpdate: () => void;
}

const bitFlagsCache = new Map<string, number>(); // (str, flags)

const containerClasses: { searchBar: string; } = findByPropsLazy("searchBar", "searchHeader");

export const settings = definePluginSettings({
    searchOption: {
        type: OptionType.SELECT,
        description: "The part of the url you want to search",
        default: "hostandpath",
        options: [
            {
                label: "Entire Url",
                value: "url"
            },
            {
                label: "Path Only (/somegif.gif)",
                value: "path"
            },
            {
                label: "Host & Path (tenor.com somgif.gif)",
                value: "hostandpath",
            }
        ] as const
    }
});

export default definePlugin({
    name: "FavoriteGifSearch",
    authors: [Devs.Aria],
    description: "Adds a search bar for favorite gifs",

    patches: [
        {
            find: "renderCategoryExtras",
            replacement: [
                {
                    // https://regex101.com/r/4uHtTE/1
                    match: /(renderHeaderContent=function.{1,150}FAVORITES:return)(.{1,150};)(case.{1,200}default:return\(0,\i\.jsx\)\((?<searchComp>\i\.\i))/,
                    replace: "$1 this.state.resultType === \"Favorites\" ? $self.renderSearchBar(this, $<searchComp>) : $2; $3"
                },
                {
                    // to persist filtered favorites when component re-renders.
                    // when resizing the window the component rerenders and we loose the filtered favorites and have to type in the search bar to get them again
                    match: /(,suggestions:\i,favorites:)(\i),/,
                    replace: "$1$self.getFav($2),favCopy:$2,"
                }

            ]
        }
    ],

    settings,
    fuzzySearch,

    getTargetString,

    instance: null as Instance | null,
    renderSearchBar(instance: Instance, SearchBarComponent: TSearchBarComponent) {
        this.instance = instance;
        return (
            <ErrorBoundary noop={true}>
                <SearchBar instance={instance} SearchBarComponent={SearchBarComponent} />
            </ErrorBoundary>
        );
    },

    getFav(favorites: Gif[]) {
        if (!this.instance || this.instance.dead) return favorites;
        const { favorites: filteredFavorites } = this.instance.props;

        return filteredFavorites != null && filteredFavorites?.length !== favorites.length ? filteredFavorites : favorites;

    }
});


function SearchBar({ instance, SearchBarComponent }: { instance: Instance; SearchBarComponent: TSearchBarComponent; }) {
    const [query, setQuery] = useState("");

    const onChange = useCallback((searchQuery: string) => {
        setQuery(searchQuery);
        const { props } = instance;

        // return early
        if (searchQuery === "") {
            props.favorites = props.favCopy;
            instance.forceUpdate();
            return;
        }


        // console.time(searchQuery);

        const result = props.favCopy.map(gif => ({
            score: fuzzySearch(searchQuery.toLowerCase(), getTargetString(gif.url ?? gif.src).replace(/(%20|[_-])/g, " ").toLowerCase()),
            gif,
        })).filter(m => m.score != null) as { score: number; gif: Gif; }[];

        result.sort((a, b) => b.score - a.score);
        props.favorites = result.map(e => e.gif);

        // console.log("%courFuzzy: ", "color: blue", result,);
        // console.timeEnd(searchQuery);

        instance.forceUpdate();
    }, [instance.state]);

    useEffect(() => {
        return () => {
            instance.dead = true;
        };
    }, []);

    return (
        <SearchBarComponent
            autoFocus={true}
            className={containerClasses.searchBar}
            size={SearchBarComponent.Sizes.MEDIUM}
            onChange={onChange}
            onClear={() => {
                setQuery("");
                if (instance.props.favCopy != null) {
                    instance.props.favorites = instance.props.favCopy;
                    instance.forceUpdate();
                }
            }}
            query={query}
            placeholder="Search Favorite Gifs"
        />
    );
}



export function getTargetString(urlStr: string) {
    const url = new URL(urlStr);
    switch (settings.store.searchOption) {
        case "url":
            return url.href;
        case "path":
            if (url.host === "media.discordapp.net" || url.host === "tenor.com")
                // /attachments/899763415290097664/1095711736461537381/attachment-1.gif -> attachment-1.gif
                // /view/some-gif-hi-24248063 -> some-gif-hi-24248063
                return url.pathname.split("/").at(-1) ?? url.pathname;
            return url.pathname;
        case "hostandpath":
            if (url.host === "media.discordapp.net" || url.host === "tenor.com")
                return `${url.host} ${url.pathname.split("/").at(-1) ?? url.pathname}`;
            return `${url.host} ${url.pathname}`;

        default:
            return "";
    }
}


function fuzzySearch(searchQuery: string, targetString: string) {
    // didnt cache this function because if you have like a thousand gifs you will make a thousnad caches each time you search something new

    const searchFlags = getBitFlags(searchQuery);
    const targetFlags = getBitFlags(targetString);

    // https://github.com/farzher/fuzzysort/blob/c7f1d2674d7fa526015646bc02fd17e29662d30c/fuzzysort.js#L34
    if ((searchFlags & targetFlags) !== searchFlags) {
        return null; // return early if search flags are not a subset of target flags
    }

    let searchIndex = 0;
    let score = 0;

    for (let i = 0; i < targetString.length; i++) {
        if (targetString[i] === searchQuery[searchIndex]) {
            if (i > 0 && targetString[i - 1] === searchQuery[searchIndex - 1]) {
                score += 2; // reward consecutive chars
            }

            if (searchIndex === 0 || targetString[i - 1] === " ") {
                score *= 1.5; // bonus for matching at the beginning or after a space
            }

            score++;
            searchIndex++;
        } else {
            score--;
        }

        if (searchIndex === searchQuery.length) {
            return score;
        }
    }

    return null;
}


// https://github.com/farzher/fuzzysort/blob/c7f1d2674d7fa526015646bc02fd17e29662d30c/fuzzysort.js#L450
const getBitFlags = (str: string) => {
    if (bitFlagsCache.has(str)) {
        return bitFlagsCache.get(str)!;
    }

    let bitflags = 0;
    for (let i = 0; i < str.length; ++i) {
        const lowerCode = str.charCodeAt(i);

        if (lowerCode === 32) {
            continue; // it's important that we don't set any bitflags for space
        }

        switch (true) {
            case lowerCode >= 97 && lowerCode <= 122:
                bitflags |= 1 << (lowerCode - 97); // alphabet
                break;
            case lowerCode >= 48 && lowerCode <= 57:
                bitflags |= 1 << 26; // numbers
                break;
            case lowerCode <= 127:
                bitflags |= 1 << 30; // other ascii
                break;
            default:
                bitflags |= 1 << 31; // other utf8
        }
    }

    return bitflags;
};

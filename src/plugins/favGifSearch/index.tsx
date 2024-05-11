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
import { useCallback, useEffect, useRef, useState } from "@webpack/common";

interface SearchBarComponentProps {
    ref?: React.MutableRefObject<any>;
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


const containerClasses: { searchBar: string; } = findByPropsLazy("searchBar", "searchBarFullRow");

export const settings = definePluginSettings({
    searchOption: {
        type: OptionType.SELECT,
        description: "The part of the url you want to search",
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
                default: true
            }
        ] as const
    }
});

export default definePlugin({
    name: "FavoriteGifSearch",
    authors: [Devs.Aria],
    description: "Adds a search bar to favorite gifs.",

    patches: [
        {
            find: "renderHeaderContent()",
            replacement: [
                {
                    // https://regex101.com/r/07gpzP/1
                    // ($1 renderHeaderContent=function { ... switch (x) ... case FAVORITES:return) ($2) ($3 case default:return r.jsx(($<searchComp>), {...props}))
                    match: /(renderHeaderContent\(\).{1,150}FAVORITES:return)(.{1,150});(case.{1,200}default:return\(0,\i\.jsx\)\((?<searchComp>\i\..{1,10}),)/,
                    replace: "$1 this.state.resultType === 'Favorites' ? $self.renderSearchBar(this, $<searchComp>) : $2;$3"
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
    const ref = useRef<{ containerRef?: React.MutableRefObject<HTMLDivElement>; } | null>(null);

    const onChange = useCallback((searchQuery: string) => {
        setQuery(searchQuery);
        const { props } = instance;

        // return early
        if (searchQuery === "") {
            props.favorites = props.favCopy;
            instance.forceUpdate();
            return;
        }


        // scroll back to top
        ref.current?.containerRef?.current
            .closest("#gif-picker-tab-panel")
            ?.querySelector("[class|=\"content\"]")
            ?.firstElementChild?.scrollTo(0, 0);


        const result =
            props.favCopy
                .map(gif => ({
                    score: fuzzySearch(searchQuery.toLowerCase(), getTargetString(gif.url ?? gif.src).replace(/(%20|[_-])/g, " ").toLowerCase()),
                    gif,
                }))
                .filter(m => m.score != null) as { score: number; gif: Gif; }[];

        result.sort((a, b) => b.score - a.score);
        props.favorites = result.map(e => e.gif);

        instance.forceUpdate();
    }, [instance.state]);

    useEffect(() => {
        return () => {
            instance.dead = true;
        };
    }, []);

    return (
        <SearchBarComponent
            ref={ref}
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
    let url: URL;
    try {
        url = new URL(urlStr);
    } catch (err) {
        // Can't resolve URL, return as-is
        return urlStr;
    }

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

function fuzzySearch(searchQuery: string, searchString: string) {
    let searchIndex = 0;
    let score = 0;

    for (let i = 0; i < searchString.length; i++) {
        if (searchString[i] === searchQuery[searchIndex]) {
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

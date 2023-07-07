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
import { useCallback, useState } from "@webpack/common";

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
    state: {
        resultType?: string;
    };
    props: {
        originalFav?: Gif[],
        favorites: Gif[],
    },
    forceUpdate: () => void;
}

const containerClasses: { searchBar: string; } = findByPropsLazy("searchBar", "searchHeader");

export const settings = definePluginSettings({
    searchOption: {
        type: OptionType.SELECT,
        description: "The part of the url you want to search",
        default: "both",
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
                label: "Host Only (tenor.com)",
                value: "host"
            },
            {
                label: "Both (tenor.com somgif.gif)",
                value: "both",
            }
        ]

    }
});

export default definePlugin({
    name: "FavoriteGifSearch",
    authors: [Devs.Aria],
    description: "Adds a search bar for favorite gifs",

    patches: [
        {
            find: "renderCategoryExtras",
            replacement: {
                // https://regex101.com/r/4uHtTE/1
                match: /(renderHeaderContent=function.{1,150}FAVORITES:return)(.{1,150};)(case.{1,200}default:return\(0,\i\.jsx\)\((?<searchComp>\i\.\i))/,
                replace: "$1 this.state.resultType === \"Favorites\" ? $self.renderSearchBar(this, $<searchComp>) : $2; $3"
            }
        }
    ],

    settings,
    renderSearchBar:
        (instance: Instance, SearchBarComponent: TSearchBarComponent) => (
            <ErrorBoundary noop={true}>
                <SearchBar instance={instance} SearchBarComponent={SearchBarComponent} />
            </ErrorBoundary>
        )
});


function SearchBar({ instance, SearchBarComponent }: { instance: Instance; SearchBarComponent: TSearchBarComponent; }) {
    const [query, setQuery] = useState("");

    const onChange = useCallback((searchQuery: string) => {
        setQuery(searchQuery);
        const { props } = instance;
        props.originalFav ||= props.favorites;

        // return early
        if (searchQuery === "") {
            if (props.favorites.length !== props.originalFav.length) {
                props.favorites = props.originalFav;
                instance.forceUpdate();
            }
            return;
        }


        props.favorites = props.originalFav.filter(gif => {
            const url = new URL(gif.url ?? gif.src);
            switch (settings.store.searchOption) {
                case "url":
                    return fuzzySearch(searchQuery, url.href);
                case "host":
                    return fuzzySearch(searchQuery, url.host);
                case "path":
                    if (url.host === "media.discordapp.net" || url.host === "tenor.com")
                        // /attachments/899763415290097664/1095711736461537381/attachment-1.gif -> attachment-1.gif
                        // /view/some-gif-hi-24248063 -> some-gif-hi-24248063
                        return fuzzySearch(searchQuery, url.pathname.split("/").at(-1) ?? url.pathname);
                    return fuzzySearch(searchQuery, url.pathname);
                case "both":
                    return fuzzySearch(searchQuery, `${url.host} ${url.pathname.split("/").at(-1) ?? url.pathname}`);
            }
        });

        instance.forceUpdate();
    }, [instance.state]);


    return (
        <SearchBarComponent
            autoFocus={true}
            className={containerClasses.searchBar}
            size={SearchBarComponent.Sizes.MEDIUM}
            onChange={onChange}
            onClear={() => {
                setQuery("");
                instance.props.favorites = instance.props.originalFav!;
                instance.forceUpdate();
            }}
            query={query}
            placeholder="Search Favorite Gifs"
        />
    );
}



function fuzzySearch(searchQuery: string, searchString: string): boolean {
    searchQuery = searchQuery.toLowerCase();
    searchString = searchString.replace(/(%20|[_-])/g, " ").toLowerCase();


    let searchIndex = 0;
    for (let i = 0; i < searchString.length; i++) {
        if (searchString[i] === searchQuery[searchIndex]) {
            searchIndex++;
        }
        if (searchIndex === searchQuery.length) {
            // console.log("searchQuery = ", searchQuery, "\nsearchString = ", searchString);
            return true;
        }
    }
    return false;
}

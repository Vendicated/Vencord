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
import { findByPropsLazy, findLazy } from "@webpack";
import { useCallback, useState } from "@webpack/common";


interface Sizes {
    SMALL: string;
    MEDIUM: string;
    LARGE: string;
}

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

interface SearchBarComponentProps {
    className: string;
    size: string;
    onChange: (query: string) => void;
    onClear: () => void;
    query: string;
    placeholder: string;
}
const SearchBarComponent: ((props: SearchBarComponentProps) => JSX.Element) & { Sizes: Sizes; } = findLazy(m => m.prototype?.render?.toString()?.includes('["query","autoFocus",'));

export default definePlugin({
    name: "FavoriteGifSearch",
    authors: [Devs.Aria],
    description: "Adds a search bar for favorite gifs",

    patches: [
        {
            find: "renderCategoryExtras",
            replacement: {
                match: /(renderHeader=function.{1,500}return)(.{1,100}renderHeaderContent.{1,50})}/,
                replace: "$1[$self.renderSearchBar(this), $2]}"
            }
        }
    ],


    renderSearchBar: (instance: Instance) => instance.state?.resultType === "Favorites" ? <SearchBar instance={instance} /> : null
});


function SearchBar({ instance }: { instance: Instance; }) {
    const [query, setQuery] = useState("");

    const onChange = useCallback((quwery: string) => {
        setQuery(quwery);
        const { props } = instance;
        if (!props.originalFav) props.originalFav = props.favorites;

        props.favorites = props.originalFav.filter(gif => (gif.url ?? gif.src).includes(quwery));

        instance.forceUpdate();
    }, [instance]);


    return (
        <SearchBarComponent
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

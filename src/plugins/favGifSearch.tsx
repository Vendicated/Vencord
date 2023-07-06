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

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { useCallback, useState } from "@webpack/common";

interface SearchBarComponentProps {
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


    renderSearchBar:
        (instance: Instance, SearchBarComponent: TSearchBarComponent) => (
            <ErrorBoundary noop={true}>
                <SearchBar instance={instance} SearchBarComponent={SearchBarComponent} />
            </ErrorBoundary>
        )
});


function SearchBar({ instance, SearchBarComponent }: { instance: Instance; SearchBarComponent: TSearchBarComponent; }) {
    const [query, setQuery] = useState("");

    const onChange = useCallback((quwery: string) => {
        setQuery(quwery);
        const { props } = instance;
        props.originalFav ||= props.favorites;

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

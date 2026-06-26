/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher, LocaleStore } from "@webpack/common";

// API key is taken from the GBoard app on iOS
const TENOR_KEY = "3Z0688EVWYKH";
const RESULT_LIMIT = 100;
const SEARCH_DEBOUNCE_MS = 250;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let cachedCategories: TrendingCategories | null = null;

interface TenorMedia { url?: string; dims?: [number, number]; preview?: string; }
interface TenorResult { id: string; title?: string; itemurl?: string; media?: Array<Record<string, TenorMedia>>; }
interface TenorCategoryTag { searchterm: string; image: string; }

interface DiscordGif {
    id: string;
    title: string;
    url: string;
    src: string;
    gif_src: string;
    width?: number;
    height?: number;
    preview?: string;
}

interface TrendingCategories {
    trendingCategories: { name: string; src: string; }[];
    trendingGIFPreview: { src: string; };
}

interface GifPickerInstance {
    state: { resultType: string | null; };
    setState(state: { resultType: string | null; }, callback?: () => void): void;
    props: { searchBarRef?: RefObject<HTMLInputElement>; };
}

function tenorUrl(path: string, extra: Record<string, string> = {}) {
    return `https://api.tenor.com/v1/${path}?` + new URLSearchParams({
        key: TENOR_KEY,
        locale: LocaleStore.locale.replace("-", "_").toLowerCase(),
        ...extra
    });
}

function toDiscordGif(item: TenorResult): DiscordGif | null {
    const media = item.media?.[0];
    if (!media) return null;

    const { webm, gif } = media;
    const src = webm?.url ?? gif?.url;
    const gifSrc = gif?.url ?? src;
    if (!src || !gifSrc) return null;

    const width = webm?.dims?.[0];
    const height = webm?.dims?.[1];
    const preview = webm?.preview;

    return { id: item.id ?? src, title: item.title ?? "", url: item.itemurl ?? gifSrc, src, gif_src: gifSrc, width, height, preview };
}

function mapGifs(items: TenorResult[]) {
    return items.map(toDiscordGif).filter((g): g is DiscordGif => g != null);
}

async function fetchTenorResults(path: string, extra: Record<string, string> = {}) {
    const res = await fetch(tenorUrl(path, extra));
    if (!res.ok) return [];
    const { results = [] } = await res.json();
    return results as TenorResult[];
}

async function fetchSearch(query: string) {
    return mapGifs(await fetchTenorResults("search", { q: query, limit: String(RESULT_LIMIT) }));
}

async function fetchTrending() {
    return mapGifs(await fetchTenorResults("trending", { limit: String(RESULT_LIMIT) }));
}

async function fetchCategories(): Promise<TrendingCategories | null> {
    try {
        const res = await fetch(tenorUrl("categories", { type: "featured" }));
        if (!res.ok) return null;
        const { tags } = await res.json() as { tags?: TenorCategoryTag[]; };
        if (!tags?.length) return null;
        return {
            trendingCategories: tags.map(t => ({ name: t.searchterm, src: t.image })),
            trendingGIFPreview: { src: tags[0].image }
        };
    } catch {
        return null;
    }
}

function doFetch(query: string) {
    fetchSearch(query).then(items => {
        FluxDispatcher.dispatch(items.length
            ? { type: "GIF_PICKER_QUERY_SUCCESS", query, items }
            : { type: "GIF_PICKER_QUERY_FAILURE", query }
        );
    }).catch(() => {
        FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY_FAILURE", query });
    });
}

export default definePlugin({
    name: "TenorGifSearch",
    description: "Restore Tenor GIF search",
    authors: [Devs.Lunascape],
    patches: [
        {
            find: "renderHeaderContent()",
            replacement: [
                {
                    match: /(search\((\i),(\i),(\i)\)\{)/,
                    replace: "$1if($self.handleSearch(this,$2,$3,$4))return;"
                },
                {
                    match: /(handleSelectItem=\((\i),(\i)\)=>\{)/,
                    replace: "$1if($self.handleSelectItem(this,$2,$3))return;"
                },
                {
                    match: /placeholder:(\i),"aria-label":\i/,
                    replace: 'placeholder:$1.replace(/Giphy|Klipy/gi,"Tenor"),"aria-label":$1.replace(/Giphy|Klipy/gi,"Tenor")'
                }
            ]
        },
        {
            find: '"GIF_PICKER_TRENDING_FETCH_SUCCESS",trendingCategories:',
            replacement: {
                match: /\i\.\i\.get\(\{url:\i\.\i\.GIFS_TRENDING,/,
                replace: "return $self.handleTrendingFetch();$&"
            }
        }
    ],

    start() {
        fetchCategories().then(data => {
            if (!data) return;
            cachedCategories = data;
        });
    },

    handleTrendingFetch() {
        if (cachedCategories) {
            FluxDispatcher.dispatch({ type: "GIF_PICKER_TRENDING_FETCH_SUCCESS", ...cachedCategories });
            return;
        }
        fetchCategories().then(data => {
            if (!data) return;
            cachedCategories = data;
            FluxDispatcher.dispatch({ type: "GIF_PICKER_TRENDING_FETCH_SUCCESS", ...data });
        });
    },

    handleSearch(instance: GifPickerInstance, query: string, _type: string, immediate: boolean) {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }

        if (query === "") {
            return false;
        }

        if (instance.state.resultType !== "Search") {
            instance.setState({ resultType: "Search" });
        }

        FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY", query });

        if (immediate) {
            doFetch(query);
        } else {
            debounceTimer = setTimeout(() => doFetch(query), SEARCH_DEBOUNCE_MS);
        }

        return true;
    },

    handleSelectItem(instance: GifPickerInstance, type: string, name: string) {
        if (type === "Category") {
            FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY", query: name });
            doFetch(name);
            instance.setState({ resultType: type }, () => {
                instance.props.searchBarRef?.current?.focus();
            });
            return true;
        }
        if (type === "Trending") {
            instance.setState({ resultType: type });
            fetchTrending().then(items => {
                FluxDispatcher.dispatch(items.length
                    ? { type: "GIF_PICKER_QUERY_SUCCESS", items }
                    : { type: "GIF_PICKER_QUERY_FAILURE" }
                );
            }).catch(() => {
                FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY_FAILURE" });
            });
            return true;
        }
        return false;
    }
});

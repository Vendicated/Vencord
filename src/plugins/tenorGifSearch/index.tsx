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

let cachedCategories: TrendingCategories | null = null;

interface TenorMedia { url: string; preview: string; dims: [number, number]; }
interface TenorResult { id: string; media: Array<Record<string, TenorMedia>>; itemurl: string; }
interface TenorCategoryTag { searchterm: string; image: string; }

interface DiscordGif {
    id: string;
    title: string;
    url: string;
    src: string;
    gif_src: string;
    width: number;
    height: number;
    preview: string;
}

interface TrendingCategories {
    trendingCategories: { name: string; src: string; }[];
    trendingGIFPreview: { src: string; };
}

function tenorUrl(path: string, extra: Record<string, string> = {}) {
    return `https://api.tenor.com/v1/${path}?` + new URLSearchParams({
        key: TENOR_KEY,
        locale: LocaleStore.locale.replace("-", "_").toLowerCase(),
        ...extra
    });
}

function toDiscordGif(item: TenorResult): DiscordGif | null {
    const media = item.media[0];
    const { gif, webm } = media;

    return {
        id: item.id,
        title: "", // discord always returns a blank string
        url: item.itemurl,
        src: webm.url,
        gif_src: gif.url,
        width: webm.dims[0],
        height: webm.dims[1],
        preview: webm.preview
    };
}

function mapGifs(items: TenorResult[]) {
    return items.map(toDiscordGif).filter((g): g is DiscordGif => g != null);
}

// this is ugly sorry
async function fetchTenorResults(path: string, limit: number, extra: Record<string, string> = {}) {
    const pageSize = Math.min(limit, 50);
    const items: TenorResult[] = [];
    let pos = "";

    while (items.length < limit) {
        const params: Record<string, string> = { ...extra, limit: String(Math.min(limit - items.length, pageSize)) };
        if (pos) params.pos = pos;
        const res = await fetch(tenorUrl(path, params));
        if (!res.ok) break;
        const body = await res.json();
        const page: TenorResult[] = body.results ?? [];
        if (!page.length) break;
        items.push(...page);
        if (!body.next) break;
        pos = body.next;
    }

    return items;
}

export default definePlugin({
    name: "TenorGifSearch",
    description: "Restore Tenor GIF search",
    authors: [Devs.Lunascape],
    patches: [
        {
            find: "renderHeaderContent()",
            replacement: {
                match: /placeholder:(\i),"aria-label":\i/,
                replace: 'placeholder:$1.replace(/Giphy|Klipy/gi,"Tenor"),"aria-label":$1.replace(/Giphy|Klipy/gi,"Tenor")'
            }
        },
        {
            find: '"GIF_PICKER_TRENDING_FETCH_SUCCESS",trendingCategories:',
            replacement: [
                {
                    match: /let \i=Date\.now\(\);\i\([^)]+\),\i\.\i\.get\(\{url:\i\.\i\.GIFS_SEARCH,query:\{q:(\i),/,
                    replace: "return $self.handleSearchFetch($1);$&"
                },
                {
                    match: /""!==(\i)&&null!=\1&&\i\.\i\.get\(\{url:\i\.\i\.GIFS_SUGGEST,/,
                    replace: "return $self.handleSuggestionsFetch($1);$&"
                },
                {
                    match: /\i\.\i\.get\(\{url:\i\.\i\.GIFS_TRENDING,/,
                    replace: "return $self.handleTrendingFetch();$&"
                },
                {
                    match: /let \i=Date\.now\(\);\i\([^)]+\),\i\.\i\.get\(\{url:\i\.\i\.GIFS_TRENDING_GIFS,/,
                    replace: "return $self.handleTrendingGifsFetch();$&"
                }
            ]
        }
    ],

    start() {
        fetchCategories().then(data => {
            if (!data) return;
            cachedCategories = data;
        });
    },

    handleSearchFetch(query: string) {
        // discord has a 100 result limit for normal search
        fetchTenorResults("search", 100, { q: query }).then(results => {
            const items = mapGifs(results);
            FluxDispatcher.dispatch(items.length
                ? { type: "GIF_PICKER_QUERY_SUCCESS", query, items }
                : { type: "GIF_PICKER_QUERY_FAILURE", query }
            );
        }).catch(() => {
            FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY_FAILURE", query });
        });
    },

    handleSuggestionsFetch(query: string) {
        if (query === "" || query == null) return;
        fetch(tenorUrl("search_suggestions", { q: query, limit: "5" }))
            .then(res => res.ok ? res.json() : null)
            .then(body => {
                if (!body?.results?.length) return;
                FluxDispatcher.dispatch({ type: "GIF_PICKER_SUGGESTIONS_SUCCESS", query, items: body.results });
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

    handleTrendingGifsFetch() {
        fetchTenorResults("trending", 50).then(results => {
            const items = mapGifs(results);
            FluxDispatcher.dispatch(items.length
                ? { type: "GIF_PICKER_QUERY_SUCCESS", items }
                : { type: "GIF_PICKER_QUERY_FAILURE" }
            );
        }).catch(() => {
            FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY_FAILURE" });
        });
    }
});

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

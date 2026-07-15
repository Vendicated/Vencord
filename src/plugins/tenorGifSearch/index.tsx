/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { isNonNullish } from "@utils/guards";
import definePlugin from "@utils/types";
import { FluxDispatcher, LocaleStore } from "@webpack/common";

// API key is taken from the GBoard app on iOS
const TENOR_KEY = "3Z0688EVWYKH";

let cachedCategories: TrendingCategories | null = null;

interface TenorMedia {
    url: string;
    preview: string;
    dims: [number, number];
}
interface TenorResult {
    id: string;
    media: Array<Record<string, TenorMedia>>;
    itemurl: string;
}
interface TenorCategoryTag {
    searchterm: string;
    image: string;
}

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
    trendingCategories: Record<"name" | "src", string>[];
    trendingGIFPreview: { src: string; };
}

function toDiscordGif(item: TenorResult): DiscordGif | null {
    const { gif, webm } = item.media[0];

    return {
        id: item.id,
        title: "", // discord always returns a blank string
        url: item.itemurl,
        gif_src: gif.url,
        src: webm.url,
        width: webm.dims[0],
        height: webm.dims[1],
        preview: webm.preview
    };
}

function mapToDiscordGifs(items: TenorResult[]) {
    return items.map(toDiscordGif).filter(isNonNullish);
}

async function tenorFetch<TResult>(path: string, params: Record<string, string>) {
    const url = `https://api.tenor.com/v1${path}?` + new URLSearchParams({
        key: TENOR_KEY,
        locale: LocaleStore.locale.replace("-", "_").toLowerCase(),
        ...params
    });

    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`GET ${path}: Tenor API request failed with status ${res.status}`);

    return res.json() as Promise<TResult>;
}

// function contributed by taep96
async function fetchTenorResults(path: string, limit: number, extra: Record<string, string> = {}) {
    const pageSize = Math.min(limit, 50);
    const items: TenorResult[] = [];
    const seen = new Set<string>();
    let pos = "";

    while (items.length < limit) {
        const params: Record<string, string> = {
            ...extra,
            limit: String(Math.min(limit - items.length, pageSize))
        };
        if (pos) params.pos = pos;

        const { next, results: page } = await tenorFetch<{ next?: string; results: TenorResult[]; }>(path, params);
        if (!page.length) break;

        const previousLength = items.length;
        for (const item of page) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);

            items.push(item);
            if (items.length >= limit) break;
        }
        if (items.length === previousLength) break;

        if (!next || next === pos) break;
        pos = next;
    }

    return items;
}

async function fetchCategories(): Promise<TrendingCategories | null> {
    return tenorFetch<{ tags?: TenorCategoryTag[]; }>("/categories", { type: "featured" })
        .then(({ tags }) => {
            if (!tags?.length) return null;

            return {
                trendingCategories: tags.map(t => ({ name: t.searchterm, src: t.image })),
                trendingGIFPreview: { src: tags[0].image }
            };
        })
        .catch(() => null);

}

export default definePlugin({
    name: "TenorGifSearch",
    description: "Restore Tenor GIF search",
    authors: [Devs.Lunascape],

    patches: [
        {
            find: "renderHeaderContent()",
            replacement: {
                match: /placeholder:(\i),"aria-label":(\i)/,
                replace: 'placeholder:$1?.replace(/Giphy|Klipy/gi,"Tenor"),"aria-label":$2?.replace(/Giphy|Klipy/gi,"Tenor")'
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
                },
                {
                    match: /\i\.\i\.post\(\{url:\i\.\i\.GIFS_SELECT,body:\{id:(\i),q:(\i),provider:\i\}/,
                    replace: "return $self.handleGifSelect($1,$2);$&"
                }
            ]
        },
        {
            find: '"IntegrationQueryStore"',
            replacement: {
                match: /(?<=search\((\i),(\i)\)\{)null==\i\.getResults\(\1,\2\)&&/,
                replace: "return $self.tenorIntegrationSearch($1,$2);null==void 0&&"
            }
        }
    ],

    async start() {
        cachedCategories = await fetchCategories() ?? cachedCategories;
    },

    handleSearchFetch(query: string) {
        // discord has a 100 result limit for normal search
        fetchTenorResults("/search", 100, { q: query })
            .then(results => {
                const items = mapToDiscordGifs(results);
                FluxDispatcher.dispatch(
                    items.length
                        ? { type: "GIF_PICKER_QUERY_SUCCESS", query, items }
                        : { type: "GIF_PICKER_QUERY_FAILURE", query }
                );
            })
            .catch(() => {
                FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY_FAILURE", query });
            });
    },

    async handleSuggestionsFetch(query: string) {
        if (!query) return;

        const { results } = await tenorFetch<{ results?: string[]; }>("/search_suggestions", { q: query, limit: "5" });

        FluxDispatcher.dispatch({ type: "GIF_PICKER_SUGGESTIONS_SUCCESS", query, items: results });
    },

    async handleTrendingFetch() {
        if (!cachedCategories) {
            cachedCategories = await fetchCategories();

            if (!cachedCategories) return;
        }

        FluxDispatcher.dispatch({ type: "GIF_PICKER_TRENDING_FETCH_SUCCESS", ...cachedCategories });
    },

    handleGifSelect(id: string, query: string) {
        tenorFetch("/registershare", { id, q: query });
    },

    handleTrendingGifsFetch() {
        fetchTenorResults("/trending", 50)
            .then(results => {
                const items = mapToDiscordGifs(results);
                FluxDispatcher.dispatch(
                    items.length
                        ? { type: "GIF_PICKER_QUERY_SUCCESS", items }
                        : { type: "GIF_PICKER_QUERY_FAILURE" }
                );
            })
            .catch(() => {
                FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY_FAILURE" });
            });
    },

    tenorIntegrationSearch(integration: string, query: string) {
        FluxDispatcher.dispatch({ type: "INTEGRATION_QUERY", integration, query });

        fetchTenorResults("/search", 20, { q: query })
            .then(results => {
                const items = mapToDiscordGifs(results);
                FluxDispatcher.dispatch(
                    items.length
                        ? { type: "INTEGRATION_QUERY_SUCCESS", integration, query, results: items }
                        : { type: "INTEGRATION_QUERY_FAILURE", integration, query }
                );
            })
            .catch(() => {
                FluxDispatcher.dispatch({ type: "INTEGRATION_QUERY_FAILURE", integration, query, results: [] });
            });
    }
});

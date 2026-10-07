/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isNonNullish } from "@utils/guards";
import { GIFPickerViewStore, LocaleStore } from "@webpack/common";

import { DiscordGif, TrendingCategoriesData } from ".";

// API key is taken from the GBoard app on iOS
const TENOR_KEY = "3Z0688EVWYKH";

interface TenorMedia {
    url: string;
    preview: string;
    dims: [number, number];
}
interface TenorResult {
    id: string;
    title: string;
    h1_title: string;
    media: Array<Record<string, TenorMedia>>;
    itemurl: string;
}
interface TenorCategoryTag {
    searchterm: string;
    image: string;
}

async function fetchApi<TResult>(path: string, params: Record<string, string>) {
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

        const { next, results: page } = await fetchApi<{ next?: string; results: TenorResult[]; }>(path, params);
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

function toDiscordGif(item: TenorResult): DiscordGif | null {
    // Discord uses tinywebp on Linux, webm on rest (including web Linux). Tenor only has "webp", not "tinywebp"
    const format = GIFPickerViewStore.getSelectedFormat() === "tinywebp"
        ? "webp"
        : "tinywebm";

    const { title, h1_title, id, itemurl } = item;
    const { gif, [format]: mediaItem } = item.media[0];

    return {
        id: id,
        title: title || h1_title,
        url: itemurl,
        gif_src: gif.url,
        src: mediaItem.url,
        width: mediaItem.dims[0],
        height: mediaItem.dims[1],
        preview: mediaItem.preview
    };
}

function mapToDiscordGifs(items: TenorResult[]) {
    return items.map(toDiscordGif).filter(isNonNullish);
}

export const search = (q: string, limit: number) => fetchTenorResults("/search", limit, { q }).then(mapToDiscordGifs);
export const searchSuggestions = (q: string) => fetchApi<{ results?: string[]; }>("/search_suggestions", { q, limit: "5" }).then(res => res.results ?? []);
export const getTrending = (limit: number) => fetchTenorResults("/trending", limit).then(mapToDiscordGifs);
export const registerShare = (id: string, q: string) => fetchApi("/registershare", { id, q });

export async function getCategories(): Promise<TrendingCategoriesData | null> {
    const res = await fetchApi<{ tags?: TenorCategoryTag[]; }>("/categories", { type: "featured" }).catch(() => null);

    if (!res?.tags?.length) return null;

    return {
        trendingCategories: res.tags.map(t => ({ name: t.searchterm, src: t.image })),
        trendingGIFPreview: { src: res.tags[0].image }
    };
}

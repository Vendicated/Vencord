/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isNonNullish } from "@utils/guards";
import { GIFPickerViewStore, LocaleStore } from "@webpack/common";

import { DiscordGif, TrendingCategoriesData } from ".";

// API key is taken from the giphy.com website
const GIPHY_KEY = "Gc7131jiJuvI7IdN0HZ1D7nh0ow5BU6g";

interface GiphyImage {
    url: string;
    width: string;
    height: string;
    mp4?: string;
    webp?: string;
}
interface GiphyResult {
    id: string;
    title: string;
    url: string;
    images: Record<string, GiphyImage>;
}
interface GiphyCategory {
    name: string;
    gif?: GiphyResult;
}

const MAX_PAGE_SIZE = 50;

function getLang() {
    const locale = LocaleStore.locale.toLowerCase();
    // Giphy accepts two-letter codes, plus zh-CN / zh-TW
    if (locale.startsWith("zh"))
        return locale.includes("tw") || locale.includes("hant") ? "zh-TW" : "zh-CN";

    return locale.split("-")[0];
}

async function fetchApi<TResult>(path: string, params: Record<string, string> = {}) {
    const url = `https://api.giphy.com/v1${path}?` + new URLSearchParams({
        api_key: GIPHY_KEY,
        lang: getLang(),
        ...params
    });

    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`GET ${path}: Giphy API request failed with status ${res.status}`);

    return res.json() as Promise<TResult>;
}

async function fetchGiphyResults(path: string, limit: number, extra: Record<string, string> = {}) {
    const pageCount = Math.ceil(limit / MAX_PAGE_SIZE);

    const pages = await Promise.all(Array.from({ length: pageCount }, (_, i) => {
        const offset = i * MAX_PAGE_SIZE;
        return fetchApi<{ data?: GiphyResult[]; }>(path, {
            ...extra,
            limit: String(Math.min(MAX_PAGE_SIZE, limit - offset)),
            offset: String(offset)
        });
    }));

    // Dedupe by id (offset pagination can overlap if results shift between requests)
    const unique = new Map(pages.flatMap(p => p.data ?? []).map(item => [item.id, item]));
    return [...unique.values()].slice(0, limit);
}

function toDiscordGif(item: GiphyResult): DiscordGif | null {
    // Discord uses tinywebp on Linux, webm on rest (including web Linux). Giphy has webp and mp4, but no webm
    const format = GIFPickerViewStore.getSelectedFormat() === "tinywebp"
        ? "webp"
        : "mp4";

    const { id, title, url, images } = item;
    const { original, fixed_height, fixed_height_still } = images;

    const src = fixed_height?.[format];
    if (!original?.url || !src) return null;

    return {
        id,
        title,
        url,
        gif_src: original.url,
        src,
        width: Number(fixed_height.width),
        height: Number(fixed_height.height),
        preview: fixed_height_still?.url ?? original.url
    };
}

function mapToDiscordGifs(items: GiphyResult[]) {
    return items.map(toDiscordGif).filter(isNonNullish);
}

export const search = (q: string, limit: number) => fetchGiphyResults("/gifs/search", limit, { q }).then(mapToDiscordGifs);
export const searchSuggestions = (q: string) => fetchApi<{ data?: Array<{ name: string; }>; }>("/gifs/search/tags", { q, limit: "5" }).then(res => res.data?.map(t => t.name) ?? []);
export const getTrending = (limit: number) => fetchGiphyResults("/gifs/trending", limit).then(mapToDiscordGifs);

// Giphy has no registershare endpoint, and its analytics pingbacks are optional, so this is a no-op
export async function registerShare(_id: string, _q: string) { }

export async function getCategories(): Promise<TrendingCategoriesData | null> {
    const res = await fetchApi<{ data?: GiphyCategory[]; }>("/gifs/categories").catch(() => null);

    const categories = res?.data
        ?.map(c => ({ name: c.name, src: c.gif?.images?.fixed_height?.url }))
        .filter((c): c is { name: string; src: string; } => !!c.src);

    if (!categories?.length) return null;

    return {
        trendingCategories: categories,
        trendingGIFPreview: { src: categories[0].src }
    };
}

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

import { makeLazy } from "@utils/misc";

interface CachedResult {
    time: number;
    data: unknown;
}

interface ThemeSearchOptions {
    query?: string;
    page?: number;
}

const getCacheKey = (ops: ThemeSearchOptions) => {
    return `${ops.page}||${ops.query}`;
};

const cache = new Map<string, CachedResult>();
const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

setInterval(() => {
    cache.forEach((value, key) => {
        if (value.time + CACHE_TIME < Date.now()) cache.delete(key);
    });
}, 10000);

const CacheProxy = {
    get: (ops: ThemeSearchOptions): unknown => {
        const key = getCacheKey(ops);
        const result = cache.get(key);
        if (!result) return null;
        return result.data;
    },
    set: (ops: ThemeSearchOptions, data: unknown) => {
        const key = getCacheKey(ops);
        cache.set(key, { time: Date.now(), data });
    }
};

const proxy = "https://corsproxy.io/?";
const host = "betterdiscord.app";

const baseUrl = `https://${host}/Addon/GetApprovedAddons`;
const getDomParser = makeLazy(() => new DOMParser());


export interface ThemeSearchResult {
    meta: {
        name: string,
        href: string,
        author: string,
        authorUrl: string,
        description?: string,
        tags: string[],

        stats: {
            downloads?: string,
            likes?: string,
        };
    },
    download: string;
    preview: string;
}

export const getThemes = async (ops: ThemeSearchOptions): Promise<ThemeSearchResult[]> => {
    const cached = CacheProxy.get(ops);
    if (cached) return cached as ThemeSearchResult[];

    const params = new URLSearchParams({
        type: "theme",
        filter: ops.query || "",
        page: (ops.page || 1).toString(),
        pages: "2",

        sort: "Popular",
        sortDirection: "descending",
        tags: JSON.stringify([])
    });

    const res = await fetch(proxy + encodeURIComponent(`${baseUrl}?${params.toString()}`)).then(r => r.text());
    if (res.trim().length === 0) return [];

    const parser = getDomParser().parseFromString(res, "text/html");

    const data = Array.prototype.map.call(parser.querySelectorAll(".card-wrap"), (card: HTMLAnchorElement) => {
        const $ = (selector: string) => card.querySelector<HTMLElement>(selector);

        const author = card.querySelector<HTMLAnchorElement>(".package-author .author-link");
        const downloadLink = card.querySelector<HTMLAnchorElement>(".card-footer > object > a")?.href;
        const previewLink = card.querySelector<HTMLImageElement>(".card > img")?.src;

        if (!downloadLink) return null;
        if (!previewLink) return null;
        if (!author) return null;

        let download = new URL(downloadLink).hostname;
        download = downloadLink.replace(download, host);

        let href = new URL(card.href).hostname;
        href = card.href.replace(href, host);

        let authorUrl = new URL(author.href).hostname;
        authorUrl = author.href.replace(authorUrl, host);

        let preview = new URL(previewLink).hostname;
        preview = previewLink.replace(preview, host);

        return {
            meta: {
                name: $(".card-title")?.innerText?.trim() || "N/A",
                href: href,
                author: author.innerText.trim(),
                authorUrl,
                description: $(".package-description")?.innerText?.trim(),
                tags: Array.prototype.map.call(card.querySelectorAll(".addon-tag"), (tag: HTMLElement) => tag.innerText?.trim()),

                stats: {
                    downloads: $("#addon-downloads")?.innerText?.trim(),
                    likes: $("#addon-likes")?.innerText?.trim(),
                }
            },
            download,
            preview
        } as ThemeSearchResult;
    }).filter(Boolean) as ThemeSearchResult[];

    CacheProxy.set(ops, data);

    return data;
};

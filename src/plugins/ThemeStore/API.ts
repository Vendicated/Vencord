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



interface CachedResult {
    time: number;
    data: unknown;
}

export interface ThemeSearchOptions {
    query?: string;
    tags?: string[];

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

export const CorsProxy = "https://corsproxy.io/?";
export const host = "betterdiscord.app";
export const themesEndpoint = `https://api.${host}/latest/store/themes`;

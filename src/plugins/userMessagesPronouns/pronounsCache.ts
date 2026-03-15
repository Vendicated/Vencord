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

import { createStore, get, set } from "@api/DataStore";

const store = createStore("VencordPronounsCache", "pronouns");

type CacheEntry = { pronouns: string; cachedAt: number; };
const cache: Record<string, CacheEntry> = {};

get<Record<string, CacheEntry>>("cache", store).then(stored => {
    if (stored) Object.assign(cache, stored);
});

export function getCached(id: string, maxAgeDays: number): string | undefined {
    const entry = cache[id];
    if (!entry) return undefined;
    if (Date.now() - entry.cachedAt > maxAgeDays * 86_400_000) return undefined;
    return entry.pronouns;
}

export function setCached(id: string, pronouns: string) {
    cache[id] = { pronouns, cachedAt: Date.now() };
    set("cache", cache, store);
}

export function clearPronounsCache() {
    for (const key of Object.keys(cache)) {
        delete cache[key];
    }
    return set("cache", {}, store);
}

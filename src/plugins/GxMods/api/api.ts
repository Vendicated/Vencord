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

import { DataStore } from "@api/index";
import { makeLazy } from "@utils/lazy";

import { ModCatalogue } from "./ModCatalogue.d";
import type { GxModInfo } from "./ModInfo.d";


const domParser = makeLazy(() => new DOMParser());

const CORS_PROXY = "https://corsproxy.io?";

function corsUrl(url: string | URL) {
    return CORS_PROXY + encodeURIComponent(url.toString());
}

const fetchCached = async <T>(...params: Parameters<typeof fetch>): Promise<T> => {
    const [url, options] = params;
    const method = options?.method ?? "GET";
    const cacheKey = `gxmod_cache_${method}__${url}`;

    const cached = await DataStore.get<{ time: number; value: T; }>(cacheKey);
    if (cached && ((Date.now() - cached.time) / 1000) > 4 * 60 * 60) return cached.value;

    const json = await fetch(corsUrl(url as any), options).then(t => t.json()) as T;
    await DataStore.set(cacheKey, {
        time: Date.now(),
        value: json,
    });

    return json;
};


export const getMods = (page: number = 1) => {
    return fetchCached<ModCatalogue>(`https://api.gx.me/store/mods?page=${page}`);
};

// 12b2e9d1-5d7c-4ff3-aa1f-a67027ffe322

export const getModInfo = (modId: string) => {
    return fetchCached<GxModInfo>(`https://api.gx.me/store/mods/${modId}`);
};

export const getCrxLink = async (crxId: string) => {
    const params = new URLSearchParams({
        x: `id=${crxId}&v=0.1`,
    });

    const xml = await fetch(corsUrl(`https://api.gx.me/store/mods/update?${params.toString()}`)).then(t => t.text());
    const dom = domParser().parseFromString(xml, "text/xml");

    return dom.querySelector("updatecheck[codebase]")?.getAttribute("codebase") ?? null;
};

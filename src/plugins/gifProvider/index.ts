/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { RestAPI, FluxDispatcher, Flux } from "@webpack/common";

// Discord GIF format interface
interface DiscordGif {
    id: string;
    title: string;
    url: string;
    src: string;
    gif_src: string;
    width: number;
    height: number;
    preview: string;
    format?: number;
    type?: string;
}

interface DiscordCategory {
    name: string;
    src: string;
    searchterm: string;
}

// Cache for categories and trending gifs
let categoriesCache: DiscordCategory[] | null = null;
let categoriesCacheTime = 0;
let trendingGifsCache: DiscordGif[] | null = null;
let trendingGifsCacheTime = 0;
let searchResultsCache: Map<string, DiscordGif[]> = new Map();
let currentSearchQuery: string = "";
let currentSearchResults: DiscordGif[] = [];
let cachedProvider: string | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function deduplicateGifs(gifs: DiscordGif[]): DiscordGif[] {
    const seen = new Set<string>();
    const result: DiscordGif[] = [];
    for (const gif of gifs) {
        const key = gif.id || gif.url || gif.src;
        if (key && !seen.has(key)) {
            seen.add(key);
            result.push(gif);
        }
    }
    return result;
}

function deduplicateCategories(cats: DiscordCategory[]): DiscordCategory[] {
    const seen = new Set<string>();
    const result: DiscordCategory[] = [];
    for (const cat of cats) {
        const key = cat.name?.toLowerCase() || cat.src;
        if (key && !seen.has(key)) {
            seen.add(key);
            result.push(cat);
        }
    }
    return result;
}

function getGifPickerSearchStore() {
    try {
        const allStores = Flux.Store.getAll();
        for (const store of allStores) {
            const anyStore = store as any;
            if (anyStore && (typeof anyStore.getTrendingCategories === "function" || typeof anyStore.getTrendingGifs === "function")) {
                return anyStore;
            }
            // Also check for stores with getState returning categories/gifs
            if (anyStore && typeof anyStore.getState === "function") {
                try {
                    const state = anyStore.getState();
                    if (state && (Array.isArray(state.categories) || Array.isArray(state.gifs) || Array.isArray(state.trendingGifs))) {
                        return anyStore;
                    }
                } catch {}
            }
        }
    } catch {}
    return null;
}

function setStoreState(store: any, categories: any[], gifs: any[], query?: string, searchResults?: any[]) {
    if (!store) return;
    try {
        // Try to set internal _state
        if (store._state) {
            store._state = {
                ...store._state,
                categories,
                gifs,
                trendingGifs: gifs,
                trendingCategories: categories,
            };
            if (query !== undefined && store._state) {
                store._state.searchQuery = query;
                store._state.searchResults = searchResults ?? [];
                store._state.searchResultIds = (searchResults ?? []).map((g: any) => g?.id).filter(Boolean);
            }
        }
        // Try to mutate getState() return value
        if (typeof store.getState === "function") {
            const state = store.getState();
            if (state && typeof state === "object") {
                if (Array.isArray(state.categories)) state.categories = categories;
                if (Array.isArray(state.gifs)) state.gifs = gifs;
                if (Array.isArray(state.trendingGifs)) state.trendingGifs = gifs;
                if (Array.isArray(state.trendingCategories)) state.trendingCategories = categories;
                if (query !== undefined) {
                    state.searchQuery = query;
                    state.searchResults = searchResults ?? [];
                    state.searchResultIds = (searchResults ?? []).map((g: any) => g?.id).filter(Boolean);
                }
            }
        }
        // Also set direct properties as fallback
        store.categories = categories;
        store.gifs = gifs;
        store.trendingGifs = gifs;
        store.trendingCategories = categories;
        if (query !== undefined) {
            store.searchQuery = query;
            store.searchResults = searchResults ?? [];
            store.searchResultIds = (searchResults ?? []).map((g: any) => g?.id).filter(Boolean);
        }
    } catch (e) {
        console.error("[GifProvider] Error setting store state:", e);
    }
}

function handleProviderChange(newValue: string, currentQuery?: string) {
    categoriesCache = null;
    categoriesCacheTime = 0;
    trendingGifsCache = null;
    trendingGifsCacheTime = 0;
    searchResultsCache.clear();
    currentSearchQuery = "";
    currentSearchResults = [];
    cachedProvider = null;

    const store = getGifPickerSearchStore();
    const hasActiveSearch = !!(currentQuery && currentQuery.trim());

    // Clear store state immediately so old content disappears
    if (hasActiveSearch) {
        // Stay in search mode: keep query, clear results so user sees fresh provider results
        setStoreState(store, [], [], currentQuery!, []);
        currentSearchQuery = currentQuery!;
        currentSearchResults = [];
    } else {
        setStoreState(store, [], []);
    }
    if (store) {
        try { store.emitChange(); } catch (e) {}
    }

    try {
        if (FluxDispatcher) {
            if (hasActiveSearch) {
                // Don't reset the view — just re-trigger the search with the new provider
                console.log("[GifProvider] Active search mode: skipping view reset, will re-trigger search");
            } else {
                FluxDispatcher.dispatch({ type: "GIF_PICKER_INITIALIZE" });
                FluxDispatcher.dispatch({ type: "GIF_PICKER_SEARCH_SUCCESS", query: "", gifs: [] });
                FluxDispatcher.dispatch({ type: "GIF_PICKER_CATEGORIES_FETCH_SUCCESS", categories: [] });
            }
        }
    } catch (e) {
        console.error("[GifProvider] Error clearing GIF picker store:", e);
    }

    console.log(`[GifProvider] handleProviderChange: ${newValue}, hasActiveSearch=${hasActiveSearch}, query="${currentQuery || ""}"`);

    if (hasActiveSearch) {
        // Active search: re-search on new provider by triggering Discord's native search flow.
        // We set the input value and dispatch an input event, which makes Discord call RestAPI.get,
        // and our RestAPI.get interceptor returns the results from the new provider.
        const fetchPromise = Promise.all([
            fetchCategories(newValue),
            trendingFromProvider(50, newValue)
        ]);

        // Wait for background fetch to populate caches before triggering the search
        fetchPromise.then(([categories, gifs]) => {
            categoriesCache = categories;
            categoriesCacheTime = Date.now();
            trendingGifsCache = gifs;
            trendingGifsCacheTime = Date.now();
            cachedProvider = newValue;
            setStoreState(store, categories, gifs);

            // Trigger Discord's native search for the current query.
            // We clear the input and re-set it to the same query to force Discord's
            // search handler to fire (it may ignore input events when the value didn't change).
            const gifPicker = document.querySelector('#gif-picker-tab-panel') || document.querySelector('[class*="expressionPicker"]');
            const input = gifPicker?.querySelector('input');
            if (input) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 'value'
                )?.set;
                if (nativeInputValueSetter) {
                    // Clear input to reset the search state
                    nativeInputValueSetter.call(input, "");
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    // Small delay to let Discord process the empty search
                    setTimeout(() => {
                        nativeInputValueSetter.call(input, currentQuery!);
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        console.log("[GifProvider] Re-applied search query after provider switch:", currentQuery!);
                    }, 50);
                }
            } else {
                // Fallback: manually dispatch if input not found
                searchFromProvider(currentQuery!, 50).then(searchGifs => {
                    currentSearchQuery = currentQuery!;
                    currentSearchResults = searchGifs;
                    if (FluxDispatcher) {
                        FluxDispatcher.dispatch({
                            type: "GIF_PICKER_SEARCH_SUCCESS",
                            query: currentQuery!,
                            gifs: searchGifs
                        });
                    }
                    if (store) {
                        try { store.emitChange(); } catch (e) {}
                    }
                });
            }

            patchPlaceholder();
        }).catch(err => {
            console.error("[GifProvider] Error updating cache on provider change:", err);
        });
    } else {
        // No active search: fetch categories and trending as usual
        Promise.all([
            fetchCategories(newValue),
            trendingFromProvider(50, newValue)
        ]).then(([categories, gifs]) => {
            categoriesCache = categories;
            categoriesCacheTime = Date.now();
            trendingGifsCache = gifs;
            trendingGifsCacheTime = Date.now();
            cachedProvider = newValue;

            // Push new data into store state directly
            setStoreState(store, categories, gifs);
            if (store) {
                try { store.emitChange(); } catch (e) {}
            }

            if (FluxDispatcher) {
                FluxDispatcher.dispatch({
                    type: "GIF_PICKER_CATEGORIES_FETCH_SUCCESS",
                    categories
                });
            }

            // Update placeholder and dropdown to reflect new provider
            patchPlaceholder();
        }).catch(err => {
            console.error("[GifProvider] Error updating store on provider change:", err);
        });
    }
}

// Tenor Web API credentials (same key used by tenor.com's frontend)
const TENOR_WEB_API_KEY = "AIzaSyCZt6SSh5VgVPzD9fhyzG1DprdPRhtoaR4";
const TENOR_WEB_CLIENT_KEY = "tenor_web";
const TENOR_WEB_BASE = "https://tenor.googleapis.com/v2";

export const settings = definePluginSettings({
    provider: {
        type: OptionType.SELECT,
        description: "Choose your preferred GIF provider",
        options: [
            { label: "Tenor (Web)", value: "tenor_web", default: true },
            { label: "Giphy (API key required)", value: "giphy" },
            { label: "Klipy (API key required)", value: "klipy" },
            { label: "Serika GIFs", value: "serika" },
            { label: "Imgur (Client ID required)", value: "imgur" },
        ],
        onChange(newValue: string) {
            // Provider change is handled directly by the dropdown event listener.
            // This callback just ensures the setting is persisted.
            console.log(`[GifProvider] Settings persisted provider: ${newValue}`);
        }
    },
    giphyApiKey: {
        type: OptionType.STRING,
        description: "Giphy API key (get one at developers.giphy.com)",
        default: "",
    },
    klipyApiKey: {
        type: OptionType.STRING,
        description: "Klipy API key (get one at klipy.com/developers)",
        default: "",
    },
    imgurClientId: {
        type: OptionType.STRING,
        description: "Imgur Client ID (get one at api.imgur.com)",
        default: "",
    },
    serikaInstance: {
        type: OptionType.STRING,
        description: "Serika GIFs instance URL",
        default: "https://gifs.serika.dev",
    },
    serikaApiKey: {
        type: OptionType.STRING,
        description: "Serika GIFs API key (optional, bypasses rate limits)",
        default: "",
    },
});



// Safe fetch wrapper — never throws, returns null on failure
async function safeFetch(url: string, options?: RequestInit): Promise<any | null> {
    try {
        const native = (window as any).VencordNative;
        if (native && native.csp) {
            try {
                const parsedUrl = new URL(url);
                const origin = parsedUrl.origin;
                const allowed = await native.csp.isDomainAllowed(origin, ["connect-src"]);
                if (!allowed) {
                    console.log(`[GifProvider] Requesting CSP override for: ${origin}`);
                    await native.csp.requestAddOverride(origin, ["connect-src"], "GifProvider");
                }
            } catch (cspErr) {
                console.error("[GifProvider] CSP override request failed:", cspErr);
            }
        }
        const res = await fetch(url, options);
        if (!res.ok) {
            console.warn(`[GifProvider] Fetch failed (${res.status}): ${url.substring(0, 100)}`);
            return null;
        }
        return await res.json();
    } catch (err) {
        console.error("[GifProvider] Fetch error:", err);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TENOR WEB
//  Uses the public API key that tenor.com's frontend uses.
//  Endpoint: https://tenor.googleapis.com/v2/{search|featured|categories}
//  Response: { results: [{ id, title, content_description, media_formats: { gif: { url, dims }, tinygif: { url, dims } } }] }
// ─────────────────────────────────────────────────────────────────────────────

function transformTenorWebToDiscord(data: any): DiscordGif[] {
    if (!data?.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any) => {
        const formats = item.media_formats || {};
        const webmFormat = formats.webm || formats.tinywebm || {};
        const tinyWebmFormat = formats.tinywebm || formats.nanowebm || webmFormat;
        const gifFormat = formats.gif || formats.mediumgif || formats.tinygif || {};
        const previewFormat = tinyWebmFormat.url ? tinyWebmFormat : (formats.tinygif || formats.nanogif || gifFormat);
        const dims = webmFormat.dims || gifFormat.dims || [200, 200];

        return {
            id: item.id || Math.random().toString(36).slice(2),
            title: item.title || item.content_description || "",
            url: item.itemurl || item.url || gifFormat.url || "",
            src: webmFormat.url || gifFormat.url || "",
            gif_src: gifFormat.url || "",
            width: dims[0] || 200,
            height: dims[1] || 200,
            preview: previewFormat.url || gifFormat.url || "",
            format: 2,
            type: "GIF",
        };
    }).filter((gif: DiscordGif) => gif.url);
}

function transformTenorCategoriesToDiscord(data: any): DiscordCategory[] {
    if (!data?.tags || !Array.isArray(data.tags)) return [];

    return data.tags
        .filter((tag: any) => tag.name && tag.image)
        .map((tag: any) => ({
            name: tag.name.replace(/^#/, ""),
            src: tag.image,
            searchterm: tag.searchterm || tag.name.replace(/^#/, ""),
        }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  GIPHY
//  Endpoint: https://api.giphy.com/v1/gifs/{search|trending}?api_key=...
//  Response: { data: [{ id, title, images: { original: { url, width, height }, fixed_height_small: { url } } }] }
// ─────────────────────────────────────────────────────────────────────────────

function transformGiphyToDiscord(data: any): DiscordGif[] {
    if (!data?.data || !Array.isArray(data.data)) return [];

    return data.data.map((gif: any) => {
        const original = gif.images?.original || {};
        const fixedHeight = gif.images?.fixed_height || {};
        const preview = gif.images?.fixed_height_small || gif.images?.preview_gif || {};
        
        const videoUrl = original.mp4 || fixedHeight.mp4 || original.url || "";
        const previewVideoUrl = preview.mp4 || fixedHeight.mp4 || original.mp4 || preview.url || original.url || "";

        return {
            id: gif.id || Math.random().toString(36).slice(2),
            title: gif.title || "",
            url: original.url || gif.images?.downsized?.url || "",
            src: videoUrl,
            gif_src: original.url || gif.images?.downsized?.url || "",
            width: parseInt(original.width) || 200,
            height: parseInt(original.height) || 200,
            preview: previewVideoUrl,
            format: 2,
            type: "GIF",
        };
    }).filter((gif: DiscordGif) => gif.url);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SERIKA GIFS
//  Endpoint: https://gifs.serika.dev/api/gifs?search=...&limit=...&sort=trending
//  Response: { gifs: [{ id, slug, title, url, webmUrl, thumbnailUrl, width, height }] }
//  Tags:     https://gifs.serika.dev/api/tags?limit=...
//  Response: { tags: [{ id, name, slug, count }] }
// ─────────────────────────────────────────────────────────────────────────────

function transformSerikaToDiscord(data: any): DiscordGif[] {
    const gifs = data?.gifs || data?.data || [];
    if (!Array.isArray(gifs)) return [];

    return gifs.map((gif: any) => {
        const gifUrl = gif.url || gif.originalUrl || "";
        const webmUrl = gif.webmUrl || gifUrl.replace(/\.gif$/i, ".webm");
        return {
            id: gif.id?.toString() || gif.slug || Math.random().toString(36).slice(2),
            title: gif.title || "",
            url: gifUrl,
            src: webmUrl,
            gif_src: gifUrl,
            width: gif.width || 200,
            height: gif.height || 200,
            preview: gif.thumbnailUrl || webmUrl,
            format: 2,
            type: "GIF",
        };
    }).filter((gif: DiscordGif) => gif.url);
}

// ─────────────────────────────────────────────────────────────────────────────
//  IMGUR
//  Endpoint: https://api.imgur.com/3/gallery/search?q=...&q_type=anigif
//  Auth:     Authorization: Client-ID {client_id}
//  Response: { data: [{ is_album, images: [{ id, animated, type, link, mp4, width, height }] }] }
//
//  IMPORTANT: Imgur gallery search returns ALBUMS with nested images arrays.
//  We need to flatten albums and extract individual animated images.
// ─────────────────────────────────────────────────────────────────────────────

function transformImgurToDiscord(data: any): DiscordGif[] {
    if (!data?.data || !Array.isArray(data.data)) return [];

    const results: DiscordGif[] = [];

    for (const item of data.data) {
        // Albums contain nested images array
        if (item.is_album && Array.isArray(item.images)) {
            for (const img of item.images) {
                if (img.animated || img.type?.includes("gif") || img.mp4 || img.link?.endsWith(".gif")) {
                    const directUrl = img.link || img.mp4 || "";
                    const videoUrl = img.mp4 || img.link || "";
                    const previewUrl = img.mp4 || (img.link ? img.link.replace(/\.gif$/i, "s.gif") : "") || "";
                    results.push({
                        id: img.id || Math.random().toString(36).slice(2),
                        title: item.title || img.title || img.description || "",
                        url: directUrl,
                        src: videoUrl,
                        gif_src: img.link || "",
                        width: img.width || 200,
                        height: img.height || 200,
                        preview: previewUrl,
                        format: 2,
                        type: "GIF",
                    });
                }
            }
        }
        // Direct image (non-album gallery item)
        else if (item.animated || item.type?.includes("gif") || item.mp4 || item.link?.endsWith(".gif")) {
            const directUrl = item.link || item.mp4 || "";
            const videoUrl = item.mp4 || item.link || "";
            const previewUrl = item.mp4 || (item.link ? item.link.replace(/\.gif$/i, "s.gif") : "") || "";
            results.push({
                id: item.id || Math.random().toString(36).slice(2),
                title: item.title || item.description || "",
                url: directUrl,
                src: videoUrl,
                gif_src: item.link || "",
                width: item.width || 200,
                height: item.height || 200,
                preview: previewUrl,
                format: 2,
                type: "GIF",
            });
        }
    }

    return results.filter(gif => gif.url);
}

// ─────────────────────────────────────────────────────────────────────────────
//  KLIPY
//  Endpoint: https://api.klipy.com/api/v1/{API_KEY}/gifs/{search|trending}?q=...&limit=...
//  NOTE: API key goes in the URL path, NOT as a query parameter!
//  Response: { result: true, data: { data: [{ id, slug, title, file: { hd: { gif: { url, width, height } }, sm: { gif: { url } } } }] } }
// ─────────────────────────────────────────────────────────────────────────────

function transformKlipyToDiscord(data: any): DiscordGif[] {
    const items = data?.data?.data || data?.data || data?.results || [];
    if (!Array.isArray(items)) return [];

    return items.map((gif: any) => {
        const file = gif.file || {};
        const hd = file.hd || {};
        const md = file.md || {};
        const sm = file.sm || {};
        const xs = file.xs || {};

        const hdGif = hd.gif || md.gif || sm.gif || {};
        const previewGif = sm.gif || xs.gif || hdGif;

        const videoUrl = hd.mp4?.url || hd.webm?.url || md.mp4?.url || md.webm?.url || sm.mp4?.url || sm.webm?.url || hdGif.url || "";
        const previewVideoUrl = sm.mp4?.url || sm.webm?.url || xs.mp4?.url || xs.webm?.url || videoUrl || previewGif.url || "";

        return {
            id: gif.id?.toString() || gif.slug || Math.random().toString(36).slice(2),
            title: gif.title || "",
            url: hdGif.url || "",
            src: videoUrl,
            gif_src: hdGif.url || "",
            width: hdGif.width || 200,
            height: hdGif.height || 200,
            preview: previewVideoUrl,
            format: 2,
            type: "GIF",
        };
    }).filter((gif: DiscordGif) => gif.url);
}

// ─── Category fetchers ──────────────────────────────────────────────────────

async function fetchTenorWebCategories(): Promise<DiscordCategory[]> {
    if (categoriesCache && Date.now() - categoriesCacheTime < CACHE_DURATION) {
        return categoriesCache;
    }

    const data = await safeFetch(
        `${TENOR_WEB_BASE}/categories?key=${TENOR_WEB_API_KEY}&client_key=${TENOR_WEB_CLIENT_KEY}&contentfilter=low`
    );
    if (!data) return [];

    const categories = deduplicateCategories(transformTenorCategoriesToDiscord(data));
    categoriesCache = categories;
    categoriesCacheTime = Date.now();
    return categories;
}

async function fetchSerikaCategories(): Promise<DiscordCategory[]> {
    if (categoriesCache && Date.now() - categoriesCacheTime < CACHE_DURATION) {
        return categoriesCache;
    }

    const baseUrl = settings.store.serikaInstance.replace(/\/$/, "");
    const apiKey = settings.store.serikaApiKey?.trim();
    const headers: Record<string, string> = {};
    if (apiKey) headers["X-API-Key"] = apiKey;

    const tagsData = await safeFetch(`${baseUrl}/api/tags?limit=30`, { headers });
    if (!tagsData) return [];

    const tags = tagsData.tags || [];
    const categories: DiscordCategory[] = [];

    // Fetch sample GIFs for top tags in parallel (fetch a few and pick a random one so previews don't all repeat)
    const tagPromises = tags.slice(0, 20).map(async (tag: any) => {
        try {
            const gifData = await safeFetch(`${baseUrl}/api/gifs?tag=${tag.slug}&limit=5&sort=views`, { headers });
            const gifs = gifData?.gifs || [];
            if (gifs.length > 0) {
                // Pick a random GIF from the results, not always the first one
                const gif = gifs[Math.floor(Math.random() * gifs.length)];
                return {
                    name: tag.name,
                    src: gif.thumbnailUrl || gif.url || "",
                    searchterm: tag.slug || tag.name,
                };
            }
        } catch { /* ignore */ }
        return null;
    });

    const results = await Promise.all(tagPromises);
    for (const cat of results) {
        if (cat && cat.src) categories.push(cat);
    }

    const deduped = deduplicateCategories(categories);
    categoriesCache = deduped;
    categoriesCacheTime = Date.now();
    return deduped;
}

const POPULAR_CATEGORIES = [
    "funny", "excited", "happy", "sad", "love", "laughing", "angry", "surprised", 
    "yes", "no", "hello", "bye", "crying", "dancing", "facepalm", "shrug", 
    "smug", "wink", "scared", "mind blown"
];

async function fetchKlipyCategories(): Promise<DiscordCategory[]> {
    if (categoriesCache && Date.now() - categoriesCacheTime < CACHE_DURATION) {
        return categoriesCache;
    }

    const apiKey = settings.store.klipyApiKey?.trim();
    if (!apiKey) return [];

    const categories: DiscordCategory[] = [];
    const tagPromises = POPULAR_CATEGORIES.map(async (name) => {
        try {
            const data = await safeFetch(
                `https://api.klipy.com/api/v1/${apiKey}/gifs/search?q=${encodeURIComponent(name)}&limit=1`
            );
            const items = data?.data?.data || data?.data || data?.results || [];
            if (items[0]) {
                const file = items[0].file || {};
                const sm = file.sm || {};
                const hd = file.hd || {};
                const previewImg = sm.gif?.url || hd.gif?.url || sm.mp4?.url || "";
                if (previewImg) {
                    return {
                        name: name.charAt(0).toUpperCase() + name.slice(1),
                        src: previewImg,
                        searchterm: name,
                    };
                }
            }
        } catch { /* ignore */ }
        return null;
    });

    const results = await Promise.all(tagPromises);
    for (const cat of results) {
        if (cat && cat.src) categories.push(cat);
    }

    const deduped = deduplicateCategories(categories);
    categoriesCache = deduped;
    categoriesCacheTime = Date.now();
    return deduped;
}

async function fetchGiphyCategories(): Promise<DiscordCategory[]> {
    if (categoriesCache && Date.now() - categoriesCacheTime < CACHE_DURATION) {
        return categoriesCache;
    }

    const apiKey = settings.store.giphyApiKey?.trim();
    if (!apiKey) return [];

    const data = await safeFetch(
        `https://api.giphy.com/v1/gifs/categories?api_key=${apiKey}`
    );
    if (!data?.data || !Array.isArray(data.data)) return [];

    const categories: DiscordCategory[] = [];
    for (const item of data.data) {
        const gif = item.gif || {};
        const images = gif.images || {};
        const fixedHeight = images.fixed_height || images.original || {};
        const previewUrl = fixedHeight.url || images.original?.url || images.fixed_height_small?.url || "";
        if (previewUrl && item.name) {
            categories.push({
                name: item.name,
                src: previewUrl,
                searchterm: item.name,
            });
        }
    }

    const deduped = deduplicateCategories(categories);
    categoriesCache = deduped;
    categoriesCacheTime = Date.now();
    return deduped;
}

async function fetchCategories(providerOverride?: string): Promise<DiscordCategory[]> {
    const provider = providerOverride || settings.store.provider;
    const useCache = !providerOverride;
    
    if (useCache && categoriesCache && Date.now() - categoriesCacheTime < CACHE_DURATION && cachedProvider === provider) {
        return categoriesCache;
    }
    
    try {
        let categories: DiscordCategory[] = [];
        switch (provider) {
            case "tenor_web":
                categories = await fetchTenorWebCategories();
                break;
            case "serika":
                categories = await fetchSerikaCategories();
                break;
            case "klipy":
                categories = await fetchKlipyCategories();
                break;
            case "giphy":
                categories = await fetchGiphyCategories();
                break;
            default:
                categories = [];
        }
        if (useCache) {
            categoriesCache = categories;
            categoriesCacheTime = Date.now();
            cachedProvider = provider;
        }
        return categories;
    } catch (err) {
        console.error("[GifProvider] Categories error:", err);
        return [];
    }
}

// ─── Search / Trending ──────────────────────────────────────────────────────

async function searchFromProvider(query: string, limit: number = 50): Promise<DiscordGif[]> {
    const provider = settings.store.provider;
    const cacheKey = `${provider}:${query.toLowerCase().trim()}`;
    if (searchResultsCache.has(cacheKey)) {
        return searchResultsCache.get(cacheKey)!;
    }

    try {
        let gifs: DiscordGif[] = [];
        switch (provider) {
            case "tenor_web": {
                const data = await safeFetch(
                    `${TENOR_WEB_BASE}/search?key=${TENOR_WEB_API_KEY}&client_key=${TENOR_WEB_CLIENT_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&contentfilter=low`
                );
                gifs = transformTenorWebToDiscord(data);
                break;
            }
            case "giphy": {
                const apiKey = settings.store.giphyApiKey?.trim();
                if (!apiKey) {
                    console.warn("[GifProvider] Giphy requires an API key");
                    return [];
                }
                const data = await safeFetch(
                    `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(query)}&limit=${limit}&api_key=${apiKey}`
                );
                gifs = transformGiphyToDiscord(data);
                break;
            }
            case "serika": {
                const baseUrl = settings.store.serikaInstance.replace(/\/$/, "");
                const apiKey = settings.store.serikaApiKey?.trim();
                const headers: Record<string, string> = {};
                if (apiKey) headers["X-API-Key"] = apiKey;
                const data = await safeFetch(
                    `${baseUrl}/api/gifs?search=${encodeURIComponent(query)}&limit=${limit}`,
                    { headers }
                );
                gifs = transformSerikaToDiscord(data);
                break;
            }
            case "imgur": {
                const clientId = settings.store.imgurClientId?.trim();
                if (!clientId) {
                    console.warn("[GifProvider] Imgur requires a Client ID");
                    return [];
                }
                // Imgur gallery search with animated filter
                const data = await safeFetch(
                    `https://api.imgur.com/3/gallery/search?q=${encodeURIComponent(query)}&q_type=anigif`,
                    { headers: { Authorization: `Client-ID ${clientId}` } }
                );
                gifs = transformImgurToDiscord(data).slice(0, limit);
                break;
            }
            case "klipy": {
                const apiKey = settings.store.klipyApiKey?.trim();
                if (!apiKey) {
                    console.warn("[GifProvider] Klipy requires an API key");
                    return [];
                }
                // Klipy: API key goes in URL path
                const data = await safeFetch(
                    `https://api.klipy.com/api/v1/${apiKey}/gifs/search?q=${encodeURIComponent(query)}&limit=${limit}`
                );
                gifs = transformKlipyToDiscord(data);
                break;
            }
            default: return [];
        }
        const results = deduplicateGifs(gifs);
        searchResultsCache.set(cacheKey, results);
        return results;
    } catch (err) {
        console.error("[GifProvider] Search error:", err);
        return [];
    }
}

async function trendingFromProvider(limit: number = 50, providerOverride?: string): Promise<DiscordGif[]> {
    const provider = providerOverride || settings.store.provider;
    const useCache = !providerOverride;

    if (useCache && trendingGifsCache && Date.now() - trendingGifsCacheTime < CACHE_DURATION && cachedProvider === provider) {
        return trendingGifsCache;
    }

    try {
        let gifs: DiscordGif[] = [];
        switch (provider) {
            case "tenor_web": {
                const data = await safeFetch(
                    `${TENOR_WEB_BASE}/featured?key=${TENOR_WEB_API_KEY}&client_key=${TENOR_WEB_CLIENT_KEY}&limit=${limit}&contentfilter=low`
                );
                gifs = transformTenorWebToDiscord(data);
                break;
            }
            case "giphy": {
                const apiKey = settings.store.giphyApiKey?.trim();
                if (!apiKey) {
                    gifs = [];
                } else {
                    const data = await safeFetch(
                        `https://api.giphy.com/v1/gifs/trending?limit=${limit}&api_key=${apiKey}`
                    );
                    gifs = transformGiphyToDiscord(data);
                }
                break;
            }
            case "serika": {
                const baseUrl = settings.store.serikaInstance.replace(/\/$/, "");
                const apiKey = settings.store.serikaApiKey?.trim();
                const headers: Record<string, string> = {};
                if (apiKey) headers["X-API-Key"] = apiKey;
                const data = await safeFetch(
                    `${baseUrl}/api/gifs?sort=trending&limit=${limit}`,
                    { headers }
                );
                gifs = transformSerikaToDiscord(data);
                break;
            }
            case "imgur": {
                const clientId = settings.store.imgurClientId?.trim();
                if (!clientId) {
                    gifs = [];
                } else {
                    // Imgur viral gallery (trending animated content)
                    const data = await safeFetch(
                        `https://api.imgur.com/3/gallery/hot/viral/0`,
                        { headers: { Authorization: `Client-ID ${clientId}` } }
                    );
                    gifs = transformImgurToDiscord(data).slice(0, limit);
                }
                break;
            }
            case "klipy": {
                const apiKey = settings.store.klipyApiKey?.trim();
                if (!apiKey) {
                    gifs = [];
                } else {
                    // Klipy: API key goes in URL path
                    const data = await safeFetch(
                        `https://api.klipy.com/api/v1/${apiKey}/gifs/trending?limit=${limit}`
                    );
                    gifs = transformKlipyToDiscord(data);
                }
                break;
            }
            default:
                gifs = [];
        }

        gifs = deduplicateGifs(gifs);
        if (useCache) {
            trendingGifsCache = gifs;
            trendingGifsCacheTime = Date.now();
            cachedProvider = provider;
        }
        return gifs;
    } catch (err) {
        console.error("[GifProvider] Trending error:", err);
        return [];
    }
}

// ─── Placeholder Management ──────────────────────────────────────────────────

let observer: MutationObserver | null = null;
let localizedSearchVerb = "";

function getSearchPlaceholder(provider: string): string {
    const providerNames: Record<string, string> = {
        tenor_web: "Tenor",
        giphy: "GIPHY",
        klipy: "Klipy",
        serika: "Serika GIFs",
        imgur: "Imgur"
    };
    const name = providerNames[provider] || "GIFs";
    
    // Default fallback
    const verb = localizedSearchVerb || "Search";
    return `${verb} ${name}`;
}

function isProviderConfigured(provider: string): boolean {
    switch (provider) {
        case "tenor_web":
            return true;
        case "serika":
            return true;
        case "giphy":
            return !!settings.store.giphyApiKey?.trim();
        case "klipy":
            return !!settings.store.klipyApiKey?.trim();
        case "imgur":
            return !!settings.store.imgurClientId?.trim();
        default:
            return false;
    }
}

function injectDropdown(container: Element) {
    const wrapper = document.createElement("div");
    wrapper.className = "gif-provider-dropdown-wrapper";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.marginLeft = "8px";
    wrapper.style.flexShrink = "0";

    const select = document.createElement("select");
    select.className = "gif-provider-dropdown";
    select.title = "Switch GIF Provider";

    // Discord-style select using CSS variables
    select.style.padding = "4px 28px 4px 8px";
    select.style.borderRadius = "4px";
    select.style.border = "1px solid var(--border-medium, #1e1f22)";
    select.style.backgroundColor = "var(--input-background, #1e1f22)";
    select.style.color = "var(--text-normal, #dbdee1)";
    select.style.fontSize = "14px";
    select.style.fontWeight = "500";
    select.style.cursor = "pointer";
    select.style.outline = "none";
    select.style.fontFamily = "var(--font-primary, sans-serif)";
    select.style.appearance = "none";
    select.style.minWidth = "90px";
    select.style.height = "32px";
    select.style.lineHeight = "1";
    select.style.backgroundImage = "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"none\" viewBox=\"0 0 24 24\"%3E%3Cpath fill=\"var(--text-muted, %23949ba4)\" d=\"M9.17 12.17a1 1 0 0 1 1.41 0L12 13.59l1.42-1.42a1 1 0 1 1 1.41 1.41l-2.12 2.12a1 1 0 0 1-1.42 0L9.17 13.58a1 1 0 0 1 0-1.41Z\"/%3E%3C/svg%3E')";
    select.style.backgroundRepeat = "no-repeat";
    select.style.backgroundPosition = "right 6px center";
    select.style.backgroundSize = "16px";

    const allProviders = [
        { label: "Tenor", value: "tenor_web" },
        { label: "Giphy", value: "giphy" },
        { label: "Klipy", value: "klipy" },
        { label: "Serika", value: "serika" },
        { label: "Imgur", value: "imgur" },
    ];

    // Only show configured providers, but always include the currently selected one
    const currentProvider = settings.store.provider;
    const providers = allProviders.filter(p =>
        isProviderConfigured(p.value) || p.value === currentProvider
    );

    providers.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.value;
        opt.textContent = p.label;
        opt.selected = currentProvider === p.value;
        select.appendChild(opt);
    });

    select.addEventListener("change", () => {
        const newValue = select.value;
        const currentProvider = settings.store.provider;
        if (newValue === currentProvider) return;

        console.log(`[GifProvider] Dropdown selected: ${newValue}`);

        // Try to persist the setting (onChange may or may not fire for direct assignment)
        settings.store.provider = newValue;

        // Read current search query and trigger provider change immediately
        const gifPicker = document.querySelector('#gif-picker-tab-panel') || document.querySelector('[class*="expressionPicker"]');
        const input = gifPicker?.querySelector('input');
        const currentQuery = input?.value?.trim() || "";
        console.log(`[GifProvider] Provider change: ${currentProvider} -> ${newValue}, query: "${currentQuery}"`);
        handleProviderChange(newValue, currentQuery || undefined);
    });

    wrapper.appendChild(select);
    container.appendChild(wrapper);
}

function patchPlaceholder() {
    const provider = settings.store.provider;
    const targetPlaceholder = getSearchPlaceholder(provider);

    // Remove provider switch from the Favorites header (it has no search input and a title like Favorites)
    document.querySelectorAll<HTMLElement>('.gif-provider-dropdown-wrapper').forEach(wrapper => {
        const headerFlex = wrapper.closest('div[class*="header"] div[class*="flex"]');
        if (headerFlex && !headerFlex.querySelector('input')) {
            wrapper.remove();
        }
    });

    // Find all search inputs in the expression picker / GIF picker
    const inputs = document.querySelectorAll<HTMLInputElement>(
        '#gif-picker-tab-panel input[placeholder], [class*="expressionPicker"] input[placeholder], [class*="searchBar"] input[placeholder], input[class*="searchBar"]'
    );
    
    for (const input of inputs) {
        const isGifSearch = input.closest('#gif-picker-tab-panel') ||
                            (input.closest('[class*="expressionPicker"]') && 
                             (document.querySelector('[class*="gifPicker"]') || 
                              input.placeholder.toLowerCase().includes("gif") || 
                              input.placeholder.toLowerCase().includes("tenor") || 
                              input.placeholder.toLowerCase().includes("giphy") ||
                              input.placeholder.toLowerCase().includes("klipy") ||
                              input.placeholder.toLowerCase().includes("serika") ||
                              input.placeholder.toLowerCase().includes("imgur")));
        
        if (isGifSearch) {
            // Keep track of the localized verb from the initial placeholder if we haven't already
            if (!localizedSearchVerb) {
                const currentPlaceholder = input.placeholder;
                if (currentPlaceholder && !currentPlaceholder.startsWith("Search ")) {
                    const words = currentPlaceholder.trim().split(/\s+/);
                    if (words.length > 1) {
                        // Assuming the first word is the verb (e.g. "Rechercher", "Buscar")
                        localizedSearchVerb = words[0];
                    }
                }
            }

            if (input.placeholder !== targetPlaceholder) {
                input.placeholder = targetPlaceholder;
                input.setAttribute("placeholder", targetPlaceholder);
                input.setAttribute("aria-label", targetPlaceholder);
            }

            // Find nearest parent flex container inside header to inject dropdown
            const headerFlex = input.closest('div[class*="header"] div[class*="flex"]');
            if (headerFlex && headerFlex.querySelector('input')) {
                // Don't inject into Favorites/other headers that have no search input
                const dropdown = headerFlex.querySelector<HTMLSelectElement>(".gif-provider-dropdown");
                if (dropdown) {
                    if (dropdown.value !== provider) {
                        dropdown.value = provider;
                    }
                } else {
                    injectDropdown(headerFlex);
                }
            }
        }
    }
}

function startPlaceholderObserver() {
    if (observer) observer.disconnect();
    
    observer = new MutationObserver(() => {
        patchPlaceholder();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Run once immediately
    patchPlaceholder();
}

function stopPlaceholderObserver() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    localizedSearchVerb = "";
    document.querySelectorAll(".gif-provider-dropdown-wrapper").forEach(el => el.remove());
    document.querySelectorAll(".gif-provider-dropdown").forEach(el => el.remove());
}

// ─── Category Click Handler ──────────────────────────────────────────────────

let categoryClickListener: ((e: MouseEvent) => void) | null = null;

function setupCategoryClickListener() {
    if (categoryClickListener) return;

    categoryClickListener = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target) return;

        // Find the category result element
        const result = target.closest('[class*="result_"]');
        if (!result) return;

        // Must be inside the GIF picker
        const gifPicker = result.closest('#gif-picker-tab-panel') || result.closest('[class*="expressionPicker"]');
        if (!gifPicker) return;

        // Skip Favorites (has categoryFadeBlurple class)
        if (result.querySelector('[class*="categoryFadeBlurple"]')) return;

        // Must be a category tile (has categoryFade but not Blurple)
        const fade = result.querySelector('[class*="categoryFade"]');
        if (!fade || fade.className.includes("Blurple")) return;

        const categoryName = result.getAttribute('aria-label');
        if (!categoryName || categoryName === 'Favorites') return;

        // Prevent React's broken click handler from firing
        e.stopPropagation();
        e.preventDefault();

        // Find the search input and set its value for visual feedback
        const input = gifPicker.querySelector('input');
        if (input) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            )?.set;
            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(input, categoryName);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        // Directly search and dispatch results to force the view to switch
        searchFromProvider(categoryName, 50).then(gifs => {
            currentSearchQuery = categoryName;
            currentSearchResults = gifs;
            if (FluxDispatcher) {
                FluxDispatcher.dispatch({
                    type: "GIF_PICKER_SEARCH_SUCCESS",
                    query: categoryName,
                    gifs
                });
            }
            // Also emit change on the store to refresh UI
            const store = getGifPickerSearchStore();
            if (store) {
                try { store.emitChange(); } catch (err) {}
            }
        }).catch(err => {
            console.error("[GifProvider] Category click search error:", err);
        });
    };

    // Use capturing phase to intercept before React's handler
    document.addEventListener('click', categoryClickListener, true);
}

function removeCategoryClickListener() {
    if (categoryClickListener) {
        document.removeEventListener('click', categoryClickListener, true);
        categoryClickListener = null;
    }
}

// ─── Search Store Getter Overrides ──────────────────────────────────────────

function ensureStorePatched() {
    const store = getGifPickerSearchStore();
    if (store && !store.originalGetTrendingCategories) {
        console.log("[GifProvider] Patching search store getters");
        store.originalGetTrendingCategories = store.getTrendingCategories;
        store.originalGetTrendingGifs = store.getTrendingGifs;
        store.originalGetState = store.getState;
        store.originalGetSearchResults = store.getSearchResults;
        store.originalGetSearchQuery = store.getSearchQuery;
        store.originalGetSearchResultsByQuery = store.getSearchResultsByQuery;

        store.getTrendingCategories = () => categoriesCache || [];
        store.getTrendingGifs = () => trendingGifsCache || [];

        // Patch search result getters if they exist
        if (typeof store.originalGetSearchResults === "function") {
            store.getSearchResults = () => currentSearchResults;
        }
        if (typeof store.originalGetSearchQuery === "function") {
            store.getSearchQuery = () => currentSearchQuery;
        }
        if (typeof store.originalGetSearchResultsByQuery === "function") {
            store.getSearchResultsByQuery = (query: string) => {
                const key = `${settings.store.provider}:${query.toLowerCase().trim()}`;
                return searchResultsCache.get(key) || [];
            };
        }

        // Also patch getState to inject our data into the returned state
        if (typeof store.getState === "function") {
            store.getState = () => {
                const state = store.originalGetState.call(store);
                return {
                    ...state,
                    categories: categoriesCache || state?.categories || [],
                    gifs: currentSearchQuery ? currentSearchResults : (trendingGifsCache || state?.gifs || []),
                    trendingGifs: trendingGifsCache || state?.trendingGifs || [],
                    trendingCategories: categoriesCache || state?.trendingCategories || [],
                    searchQuery: currentSearchQuery,
                    searchResults: currentSearchResults,
                };
            };
        }
    }
    return store;
}

// ─── Plugin definition ──────────────────────────────────────────────────────

export default definePlugin({
    name: "GifProvider",
    description: "Switch between different GIF providers (Tenor Web, Giphy, Klipy, Serika GIFs, Imgur)",
    authors: [Devs.Serika],
    settings,

    // Expose functions for console testing
    searchGifs: searchFromProvider,
    trendingGifs: trendingFromProvider,

    originalGet: null as any,
    _stopped: false,

    start() {
        this._stopped = false;
        categoriesCache = null;
        categoriesCacheTime = 0;
        trendingGifsCache = null;
        trendingGifsCacheTime = 0;
        searchResultsCache.clear();
        currentSearchQuery = "";
        currentSearchResults = [];

        console.log("[GifProvider] Started with provider:", settings.store.provider);

        // Store original RestAPI.get
        this.originalGet = RestAPI.get.bind(RestAPI);

        // Proxy RestAPI.get to intercept GIF requests
        const self = this;
        RestAPI.get = function (options: any) {
            // Guard: if plugin was stopped, don't intercept
            if (self._stopped) {
                return self.originalGet(options);
            }

            const url = options?.url || "";

            try {
                // Intercept GIF search
                if (url.includes("/gifs/search") || url.includes("gifs/search")) {
                    const query = options?.query?.q || "";
                    console.log("[GifProvider] Intercepted search:", query);
                    return self.handleSearch(query);
                }

                // /gifs/trending-gifs returns just an array
                if (url.includes("/gifs/trending-gifs") || url.includes("gifs/trending-gifs")) {
                    console.log("[GifProvider] Intercepted trending-gifs");
                    return self.handleTrendingGifs();
                }

                // /gifs/trending returns { categories: [], gifs: [] }
                if (url.includes("/gifs/trending") || url.includes("gifs/trending")) {
                    console.log("[GifProvider] Intercepted trending");
                    return self.handleTrending();
                }
            } catch (err) {
                console.error("[GifProvider] Interception error:", err);
            }

            // Fall through to original for non-GIF requests
            return self.originalGet(options);
        };

        // Start watching for search input to patch its placeholder
        startPlaceholderObserver();

        // Set up category click listener for trending/collections categories
        setupCategoryClickListener();

        // Patch store getters
        ensureStorePatched();

        // Initial fetch to populate caches
        Promise.all([
            fetchCategories(),
            trendingFromProvider(50)
        ]).then(() => {
            const store = ensureStorePatched();
            if (store) {
                try {
                    store.emitChange();
                } catch (e) {
                    console.error("[GifProvider] Error emitting change after initial fetch:", e);
                }
            }
        }).catch(err => {
            console.error("[GifProvider] Initial fetch error:", err);
        });

        // Expose to window for debugging
        (window as any).GifProvider = {
            search: searchFromProvider,
            trending: trendingFromProvider,
            categories: fetchCategories,
            settings: settings.store,
            plugin: this,
            getStore: getGifPickerSearchStore,
            patchStore: ensureStorePatched
        };
        console.log("[GifProvider] Debug: Use window.GifProvider.search('cats') to test");
    },

    async handleSearch(query: string): Promise<any> {
        try {
            const gifs = await searchFromProvider(query, 50);
            currentSearchQuery = query;
            currentSearchResults = gifs;
            console.log("[GifProvider] Search results:", gifs.length);
            return { body: gifs, status: 200, ok: true, headers: {} };
        } catch (err) {
            console.error("[GifProvider] handleSearch error:", err);
            return { body: [], status: 200, ok: true, headers: {} };
        }
    },

    async handleTrending(): Promise<any> {
        try {
            const [categories, gifs] = await Promise.all([
                fetchCategories(),
                trendingFromProvider(50),
            ]);

            console.log("[GifProvider] Trending results:", gifs.length, "categories:", categories.length);
            return {
                body: {
                    categories: categories,
                    gifs: gifs,
                    trending: { gifs, categories }
                },
                status: 200, ok: true, headers: {}
            };
        } catch (err) {
            console.error("[GifProvider] handleTrending error:", err);
            return {
                body: { categories: [], gifs: [], trending: { gifs: [], categories: [] } },
                status: 200, ok: true, headers: {}
            };
        }
    },

    async handleTrendingGifs(): Promise<any> {
        try {
            const gifs = await trendingFromProvider(50);
            console.log("[GifProvider] TrendingGifs results:", gifs.length);
            return { body: gifs, status: 200, ok: true, headers: {} };
        } catch (err) {
            console.error("[GifProvider] handleTrendingGifs error:", err);
            return { body: [], status: 200, ok: true, headers: {} };
        }
    },

    stop() {
        console.log("[GifProvider] Stopped");
        this._stopped = true;
        if (this.originalGet) {
            RestAPI.get = this.originalGet;
        }
        
        // Restore original store getters
        const store = getGifPickerSearchStore();
        if (store) {
            if (store.originalGetTrendingCategories) {
                store.getTrendingCategories = store.originalGetTrendingCategories;
                delete store.originalGetTrendingCategories;
            }
            if (store.originalGetTrendingGifs) {
                store.getTrendingGifs = store.originalGetTrendingGifs;
                delete store.originalGetTrendingGifs;
            }
            if (store.originalGetState) {
                store.getState = store.originalGetState;
                delete store.originalGetState;
            }
            if (store.originalGetSearchResults) {
                store.getSearchResults = store.originalGetSearchResults;
                delete store.originalGetSearchResults;
            }
            if (store.originalGetSearchQuery) {
                store.getSearchQuery = store.originalGetSearchQuery;
                delete store.originalGetSearchQuery;
            }
            if (store.originalGetSearchResultsByQuery) {
                store.getSearchResultsByQuery = store.originalGetSearchResultsByQuery;
                delete store.originalGetSearchResultsByQuery;
            }
            try {
                store.emitChange();
            } catch (e) {
                console.error("[GifProvider] Error emitting change on stop:", e);
            }
        }

        // Stop placeholder observer
        stopPlaceholderObserver();

        // Remove category click listener
        removeCategoryClickListener();

        // Clear cache on stop
        categoriesCache = null;
        categoriesCacheTime = 0;
        trendingGifsCache = null;
        trendingGifsCacheTime = 0;
        searchResultsCache.clear();
        currentSearchQuery = "";
        currentSearchResults = [];
        delete (window as any).GifProvider;
    },
});

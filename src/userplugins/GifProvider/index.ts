/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { createRoot, React, RestAPI, Select, useLayoutEffect, useState } from "@webpack/common";

export const settings = definePluginSettings({
    provider: {
        type: OptionType.SELECT,
        description: "Choose your preferred GIF provider",
        options: [
            { label: "Tenor (Default)", value: "tenor", default: true },
            { label: "Giphy (API key required)", value: "giphy" },
            { label: "Klipy (API key required)", value: "klipy" },
            { label: "Serika GIFs", value: "serika" },
            { label: "Imgur (API key required)", value: "imgur" },
        ],
    },
    giphyApiKey: {
        type: OptionType.STRING,
        description: "Giphy API key (get one at developers.giphy.com)",
        default: "",
    },
    klipyApiKey: {
        type: OptionType.STRING,
        description: "Klipy API key",
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

const providerOrder = ["tenor", "giphy", "serika", "imgur", "klipy"] as const;
type GifProviderName = typeof providerOrder[number];

const providerLabels: Record<GifProviderName, string> = {
    tenor: "Tenor",
    giphy: "Giphy",
    serika: "Serika",
    imgur: "Imgur",
    klipy: "Klipy",
};

const providerSelectOptions = [
    { label: "Tenor", value: "tenor" },
    { label: "Giphy", value: "giphy" },
    { label: "Serika", value: "serika" },
    { label: "Imgur", value: "imgur" },
    { label: "Klipy", value: "klipy" },
] as const;

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
}

interface DiscordCategory {
    name: string;
    src: string;
}

// Cache for categories
let categoriesCache: DiscordCategory[] | null = null;
let categoriesCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const gifPickerSelectRoots = new Map<HTMLElement, ReturnType<typeof createRoot>>();
let gifPickerFocusListenerInstalled = false;

function getCurrentProvider(): GifProviderName {
    return (settings.store.provider as GifProviderName) ?? "tenor";
}

export function getProviderLabel(provider = getCurrentProvider()) {
    return providerLabels[provider] ?? "GIF";
}

export function setProvider(provider: GifProviderName) {
    settings.store.provider = provider;
    return provider;
}

export function cycleProvider(direction = 1) {
    const currentProvider = getCurrentProvider();
    const currentIndex = providerOrder.indexOf(currentProvider);
    const nextIndex = (currentIndex + direction + providerOrder.length) % providerOrder.length;
    return setProvider(providerOrder[nextIndex]);
}

function getSearchPlaceholder() {
    return `Search ${getProviderLabel()}`;
}

const gifPreviewVideoSelector = '#gif-picker-tab-panel [role="button"][tabindex="-1"] video';
const gifPreviewImageSelector = '#gif-picker-tab-panel [role="button"][tabindex="-1"] img[data-vc-gif-provider-video="true"]';

function replaceVideoWithImage(video: HTMLVideoElement) {
    const source = video.getAttribute("src") || video.currentSrc || video.src || video.poster;
    if (!source) return;

    const image = document.createElement("img");
    image.src = source;
    image.className = video.className;
    image.width = video.width;
    image.height = video.height;
    image.alt = "";
    image.draggable = false;
    image.dataset.vcGifProviderVideo = "true";

    const style = video.getAttribute("style");
    if (style) image.setAttribute("style", style);

    for (const attribute of ["data-testid", "aria-label", "aria-describedby", "role", "tabindex"]) {
        const value = video.getAttribute(attribute);
        if (value != null) image.setAttribute(attribute, value);
    }

    video.replaceWith(image);
}

function replaceImageWithVideo(image: HTMLImageElement) {
    const source = image.getAttribute("src") || image.currentSrc || image.src;
    if (!source) return;

    const video = document.createElement("video");
    video.src = source;
    video.className = image.className;
    video.width = image.width;
    video.height = image.height;
    video.autoplay = true;
    video.loop = true;
    video.preload = "auto";

    const style = image.getAttribute("style");
    if (style) video.setAttribute("style", style);

    for (const attribute of ["data-testid", "aria-label", "aria-describedby", "role", "tabindex"]) {
        const value = image.getAttribute(attribute);
        if (value != null) video.setAttribute(attribute, value);
    }

    image.replaceWith(video);
}

function patchGifPreviewTiles() {
    cleanupDisconnectedPickerRoots();

    const provider = getCurrentProvider();
    if (provider === "tenor") {
        for (const image of document.querySelectorAll<HTMLImageElement>(gifPreviewImageSelector)) {
            replaceImageWithVideo(image);
        }
    }
}

function GifProviderHeaderControls() {
    const [provider, setProviderState] = useState<GifProviderName>(getCurrentProvider());

    useLayoutEffect(() => {
        patchGifPreviewTiles();

        const interval = window.setInterval(() => {
            patchGifPreviewTiles();
        }, 500);

        return () => {
            window.clearInterval(interval);
        };
    }, [provider]);

    return React.createElement(Select, {
        className: "vc-gifProvider-select",
        placeholder: getProviderLabel(provider),
        options: providerSelectOptions,
        closeOnSelect: true,
        select: (selectedProvider: GifProviderName) => {
            setProvider(selectedProvider);
            setProviderState(selectedProvider);
            patchGifPreviewTiles();
        },
        isSelected: (selectedProvider: GifProviderName) => selectedProvider === provider,
        serialize: (value: string) => value,
    });
}

function cleanupDisconnectedPickerRoots() {
    for (const [host, root] of gifPickerSelectRoots) {
        if (!host.isConnected) {
            root.unmount();
            gifPickerSelectRoots.delete(host);
        }
    }
}

function patchGifPickerProviderSelect() {
    cleanupDisconnectedPickerRoots();

    const pickerPanel = document.querySelector("#gif-picker-tab-panel");
    if (!pickerPanel) return;

    const inputs = pickerPanel.querySelectorAll<HTMLInputElement>('input[placeholder^="Search "]');

    for (const input of inputs) {
        const row = input.parentElement;
        if (!row) continue;

        if (row.querySelector(".vc-favGifSearch-provider")) {
            continue;
        }

        const placeholder = getSearchPlaceholder();
        if (input.placeholder !== placeholder) {
            input.placeholder = placeholder;
            input.setAttribute("aria-label", placeholder);
        }

        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "8px";

        input.style.flex = "1 1 auto";
        input.style.minWidth = "0";

        let host = row.querySelector<HTMLElement>("[data-vc-gif-provider-switcher='true']");
        if (!host) {
            host = document.createElement("div");
            host.dataset.vcGifProviderSwitcher = "true";
            host.style.flex = "0 0 9.5rem";
            host.style.minWidth = "9.5rem";
            row.appendChild(host);
        }

        let root = gifPickerSelectRoots.get(host);
        if (!root) {
            root = createRoot(host);
            gifPickerSelectRoots.set(host, root);
        }

        root.render(React.createElement(GifProviderHeaderControls));
    }
}

function onGifPickerFocusIn(event: FocusEvent) {
    const target = event.target as Element | null;
    if (!target?.closest?.("#gif-picker-tab-panel")) return;

    patchGifPickerProviderSelect();
}

function startGifPickerProviderHooks() {
    if (!gifPickerFocusListenerInstalled) {
        document.addEventListener("focusin", onGifPickerFocusIn, true);
        gifPickerFocusListenerInstalled = true;
    }

    patchGifPickerProviderSelect();
}

function stopGifPickerProviderHooks() {
    if (gifPickerFocusListenerInstalled) {
        document.removeEventListener("focusin", onGifPickerFocusIn, true);
        gifPickerFocusListenerInstalled = false;
    }

    cleanupDisconnectedPickerRoots();
    for (const [host, root] of gifPickerSelectRoots) {
        root.unmount();
        gifPickerSelectRoots.delete(host);
    }
}

// Transform Giphy response to Discord GIF format
function transformGiphyToDiscord(data: any): DiscordGif[] {
    const getGiphyMp4Url = (gif: any) =>
        gif.images?.fixed_height?.mp4
        || gif.images?.fixed_width?.mp4
        || gif.images?.original?.mp4
        || gif.images?.hd?.mp4
        || gif.images?.original?.url
        || gif.images?.downsized?.url;

    const getGiphyGifUrl = (gif: any) => {
        const mp4Url = getGiphyMp4Url(gif);
        if (!mp4Url) return mp4Url;

        // 1. Replace .mp4 with .gif
        let url = mp4Url.replace(/\.mp4(?=($|\?))/i, ".gif");

        // 2. Replace size-specific filenames (like 200.gif, 200w.gif, etc.) with giphy.gif
        // This looks for a / followed by any digits (and optional 'w'), ending in .gif
        return url.replace(/\/(\d+w?)\.gif($|\?)/i, "/giphy.gif$2");
    };

    const getGiphyWidth = (gif: any) =>
        parseInt(gif.images?.fixed_width?.width)
        || parseInt(gif.images?.fixed_height?.width)
        || parseInt(gif.images?.original?.width)
        || 200;

    const getGiphyHeight = (gif: any) =>
        parseInt(gif.images?.fixed_height?.height)
        || parseInt(gif.images?.fixed_width?.height)
        || parseInt(gif.images?.original?.height)
        || 200;

    return (data.data || []).map((gif: any) => ({
        id: gif.id,
        title: gif.title || "",
        url: getGiphyGifUrl(gif),
        src: getGiphyMp4Url(gif),
        gif_src: getGiphyGifUrl(gif),
        width: getGiphyWidth(gif),
        height: getGiphyHeight(gif),
        preview: getGiphyMp4Url(gif)
    }));
}

// Transform Serika response to Discord GIF format
function transformSerikaToDiscord(data: any): DiscordGif[] {
    const gifs = data.gifs || data.data || [];
    return gifs.map((gif: any) => {
        const gifUrl = gif.url || gif.originalUrl;
        // Use webmUrl if available, otherwise construct from gif URL
        const webmUrl = gif.webmUrl || gifUrl.replace(/\.gif$/i, ".webm");
        return {
            id: gif.id?.toString() || gif.slug || Math.random().toString(36),
            title: gif.title || "",
            url: gifUrl,
            src: webmUrl,
            gif_src: gifUrl,
            width: gif.width || 200,
            height: gif.height || 200,
            preview: webmUrl
        };
    });
}

// Transform Imgur response to Discord GIF format
function transformImgurToDiscord(data: any): DiscordGif[] {
    const items = (data.data || []).filter((item: any) =>
        item.animated || item.type?.includes("gif") || item.mp4 || item.link?.endsWith(".gif")
    );
    return items.map((gif: any) => ({
        id: gif.id,
        title: gif.title || "",
        url: gif.mp4 || gif.link,
        src: gif.mp4 || gif.link,
        gif_src: gif.link,
        width: gif.width || 200,
        height: gif.height || 200,
        preview: gif.link?.replace(".gif", "s.gif") || gif.link
    }));
}

// Transform Klipy response to Discord GIF format
function transformKlipyToDiscord(data: any): DiscordGif[] {
    const results = data.results || data.data || [];
    return results.map((gif: any) => ({
        id: gif.id,
        title: gif.title || "",
        url: gif.gif_url || gif.media?.gif?.url || gif.url,
        src: gif.gif_url || gif.media?.gif?.url || gif.url,
        gif_src: gif.gif_url || gif.media?.gif?.url || gif.url,
        width: gif.width || 200,
        height: gif.height || 200,
        preview: gif.preview_url || gif.media?.preview?.url || gif.url
    }));
}

// Fetch categories from Serika (tags with sample GIFs)
async function fetchSerikaCategories(): Promise<DiscordCategory[]> {
    // Return cached if fresh
    if (categoriesCache && Date.now() - categoriesCacheTime < CACHE_DURATION) {
        return categoriesCache;
    }

    const baseUrl = settings.store.serikaInstance.replace(/\/$/, "");
    const apiKey = settings.store.serikaApiKey?.trim();
    const headers: Record<string, string> = {};
    if (apiKey) headers["X-API-Key"] = apiKey;

    try {
        // Fetch popular tags
        const tagsRes = await fetch(`${baseUrl}/api/tags?limit=30`, { headers });
        const tagsData = await tagsRes.json();
        const tags = tagsData.tags || [];

        // Build categories with a sample GIF from each tag
        const categories: DiscordCategory[] = [];

        // Fetch sample GIFs for top tags in parallel
        const tagPromises = tags.slice(0, 20).map(async (tag: any) => {
            try {
                const gifRes = await fetch(`${baseUrl}/api/gifs?tag=${tag.slug}&limit=1&sort=views`, { headers });
                const gifData = await gifRes.json();
                const gif = gifData.gifs?.[0];
                if (gif) {
                    const webmUrl = gif.webmUrl || gif.url.replace(/\.gif$/i, ".webm");
                    return {
                        name: tag.name,
                        src: webmUrl
                    };
                }
            } catch {
                return null;
            }
            return null;
        });

        const results = await Promise.all(tagPromises);
        for (const cat of results) {
            if (cat) categories.push(cat);
        }

        // Cache the results
        categoriesCache = categories;
        categoriesCacheTime = Date.now();

        return categories;
    } catch (err) {
        console.error("[GifProvider] Error fetching categories:", err);
        return [];
    }
}

// Search GIFs from provider
async function searchFromProvider(query: string, limit: number = 50): Promise<DiscordGif[]> {
    const { provider } = settings.store;
    if (provider === "tenor") return [];

    try {
        switch (provider) {
            case "giphy": {
                const apiKey = settings.store.giphyApiKey?.trim();
                if (!apiKey) {
                    console.warn("[GifProvider] Giphy requires an API key");
                    return [];
                }
                const res = await fetch(`https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(query)}&limit=${limit}&api_key=${apiKey}`);
                return transformGiphyToDiscord(await res.json());
            }
            case "serika": {
                const baseUrl = settings.store.serikaInstance.replace(/\/$/, "");
                const apiKey = settings.store.serikaApiKey?.trim();
                const headers: Record<string, string> = {};
                if (apiKey) headers["X-API-Key"] = apiKey;
                const res = await fetch(`${baseUrl}/api/gifs?search=${encodeURIComponent(query)}&limit=${limit}`, { headers });
                return transformSerikaToDiscord(await res.json());
            }
            case "imgur": {
                const clientId = settings.store.imgurClientId?.trim();
                if (!clientId) {
                    console.warn("[GifProvider] Imgur requires a Client ID");
                    return [];
                }
                const res = await fetch(`https://api.imgur.com/3/gallery/search?q=${encodeURIComponent(query)}&q_type=anigif`, {
                    headers: { Authorization: `Client-ID ${clientId}` }
                });
                return transformImgurToDiscord(await res.json()).slice(0, limit);
            }
            case "klipy": {
                const apiKey = settings.store.klipyApiKey?.trim();
                if (!apiKey) {
                    console.warn("[GifProvider] Klipy requires an API key");
                    return [];
                }
                const res = await fetch(`https://api.klipy.co/v1/gifs/search?q=${encodeURIComponent(query)}&limit=${limit}&api_key=${apiKey}`);
                return transformKlipyToDiscord(await res.json());
            }
            default: return [];
        }
    } catch (err) {
        console.error("[GifProvider] Search error:", err);
        return [];
    }
}

// Get trending GIFs from provider (sorted by views for Serika)
async function trendingFromProvider(limit: number = 50): Promise<DiscordGif[]> {
    const { provider } = settings.store;
    if (provider === "tenor") return [];

    try {
        switch (provider) {
            case "giphy": {
                const apiKey = settings.store.giphyApiKey?.trim();
                if (!apiKey) return [];
                const res = await fetch(`https://api.giphy.com/v1/gifs/trending?limit=${limit}&api_key=${apiKey}`);
                return transformGiphyToDiscord(await res.json());
            }
            case "serika": {
                const baseUrl = settings.store.serikaInstance.replace(/\/$/, "");
                const apiKey = settings.store.serikaApiKey?.trim();
                const headers: Record<string, string> = {};
                if (apiKey) headers["X-API-Key"] = apiKey;
                // Use sort=trending for actual trending, or sort=views for most viewed
                const res = await fetch(`${baseUrl}/api/gifs?sort=trending&limit=${limit}`, { headers });
                return transformSerikaToDiscord(await res.json());
            }
            case "imgur": {
                const clientId = settings.store.imgurClientId?.trim();
                if (!clientId) return [];
                const res = await fetch("https://api.imgur.com/3/gallery/hot/viral/0", {
                    headers: { Authorization: `Client-ID ${clientId}` }
                });
                return transformImgurToDiscord(await res.json()).slice(0, limit);
            }
            case "klipy": {
                const apiKey = settings.store.klipyApiKey?.trim();
                if (!apiKey) return [];
                const res = await fetch(`https://api.klipy.co/v1/gifs/trending?limit=${limit}&api_key=${apiKey}`);
                return transformKlipyToDiscord(await res.json());
            }
            default: return [];
        }
    } catch (err) {
        console.error("[GifProvider] Trending error:", err);
        return [];
    }
}

export default definePlugin({
    name: "GifProvider",
    description: "Switch between different GIF providers (Tenor, Giphy, Klipy, Serika GIFs, Imgur)",
    authors: [Devs.Kiwi],
    settings,

    // Expose functions for console testing
    searchGifs: searchFromProvider,
    trendingGifs: trendingFromProvider,

    originalGet: null as any,

    start() {
        console.log("[GifProvider] Started with provider:", settings.store.provider);

        // Store original RestAPI.get
        this.originalGet = RestAPI.get.bind(RestAPI);

        // Proxy RestAPI.get to intercept GIF requests
        const self = this;
        RestAPI.get = function (options: any) {
            const url = options?.url || "";

            // Check if this is a GIF search or trending request
            if (settings.store.provider !== "tenor") {
                if (url.includes("/gifs/search") || url.includes("gifs/search")) {
                    const query = options?.query?.q || "";
                    console.log("[GifProvider] Intercepted search:", query, url);
                    return self.handleSearch(query);
                }

                // /gifs/trending-gifs returns just an array
                if (url.includes("/gifs/trending-gifs") || url.includes("gifs/trending-gifs")) {
                    console.log("[GifProvider] Intercepted trending-gifs:", url);
                    return self.handleTrendingGifs();
                }

                // /gifs/trending returns { categories: [], gifs: [] }
                if (url.includes("/gifs/trending") || url.includes("gifs/trending")) {
                    console.log("[GifProvider] Intercepted trending:", url);
                    return self.handleTrending();
                }
            }

            // Fall through to original
            return self.originalGet(options);
        };

        // Expose to window for debugging
        (window as any).GifProvider = {
            search: searchFromProvider,
            trending: trendingFromProvider,
            categories: fetchSerikaCategories,
            cycleProvider,
            setProvider,
            getProviderLabel,
            settings: settings.store,
            plugin: this
        };
        console.log("[GifProvider] Debug: Use window.GifProvider.search('cats') to test");

        startGifPickerProviderHooks();
    },

    async handleSearch(query: string): Promise<any> {
        try {
            const gifs = await searchFromProvider(query, 50);
            console.log("[GifProvider] Search results:", gifs.length);
            if (gifs.length > 0) {
                return { body: gifs };
            }
        } catch (err) {
            console.error("[GifProvider] Search error:", err);
        }
        return this.originalGet({ url: "/gifs/search", query: { q: query } });
    },

    async handleTrending(): Promise<any> {
        try {
            // Fetch both categories and trending GIFs
            const [categories, gifs] = await Promise.all([
                settings.store.provider === "serika" ? fetchSerikaCategories() : Promise.resolve([]),
                trendingFromProvider(50)
            ]);

            console.log("[GifProvider] Trending results:", gifs.length, "categories:", categories.length);

            if (gifs.length > 0) {
                return { body: { categories: categories, gifs: gifs } };
            }
        } catch (err) {
            console.error("[GifProvider] Trending error:", err);
        }
        return this.originalGet({ url: "/gifs/trending" });
    },

    async handleTrendingGifs(): Promise<any> {
        try {
            const gifs = await trendingFromProvider(50);
            console.log("[GifProvider] TrendingGifs results:", gifs.length);
            if (gifs.length > 0) {
                return { body: gifs };
            }
        } catch (err) {
            console.error("[GifProvider] TrendingGifs error:", err);
        }
        return this.originalGet({ url: "/gifs/trending-gifs" });
    },

    stop() {
        console.log("[GifProvider] Stopped");
        stopGifPickerProviderHooks();
        if (this.originalGet) {
            RestAPI.get = this.originalGet;
        }
        delete (window as any).GifProvider;
    }
});

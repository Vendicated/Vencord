/* eslint-disable */

/**
 * This file is part of AdGuard's Block YouTube Ads (https://github.com/AdguardTeam/BlockYouTubeAdsShortcut).
 *
 * Copyright (C) AdGuard Team
 *
 * AdGuard's Block YouTube Ads is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * AdGuard's Block YouTube Ads is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with AdGuard's Block YouTube Ads.  If not, see <http://www.gnu.org/licenses/>.
 */
(() => {
    if (window.adguardInjected) return;
    window.adguardInjected = true;

    const nativeParse = JSON.parse;
    const hasAdKeys = text => /"(?:adPlacements|playerAds|adSlots)"\s*:|\\u/.test(text);
    const pruneAds = (value, seen = new WeakSet()) => {
        if (!value || typeof value !== "object" || seen.has(value)) return value;
        seen.add(value);

        for (const key of Object.keys(value)) {
            if (key === "adSlots") {
                // The embed player loads its ad module even when adSlots is an empty array.
                delete value[key];
            } else if (key === "adPlacements" || key === "playerAds") {
                value[key] = [];
            } else {
                pruneAds(value[key], seen);
            }
        }
        return value;
    };

    JSON.parse = new Proxy(nativeParse, {
        apply(target, receiver, args) {
            const value = Reflect.apply(target, receiver, args);
            return typeof args[0] !== "string" || hasAdKeys(args[0]) ? pruneAds(value) : value;
        }
    });
    const isPlayerResponse = url => /^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/youtubei\/v\d+\/(?:player|get_watch)(?:\?|$)/.test(url);
    Response.prototype.json = new Proxy(Response.prototype.json, {
        async apply(target, receiver, args) {
            const value = await Reflect.apply(target, receiver, args);
            return isPlayerResponse(receiver.url) ? pruneAds(value) : value;
        }
    });

    const pruneText = text => {
        if (!hasAdKeys(text)) return text;
        try {
            const value = nativeParse(text);
            return JSON.stringify(pruneAds(value));
        } catch {
            return text;
        }
    };

    // YouTube can parse response text using a saved reference to JSON.parse.
    Response.prototype.text = new Proxy(Response.prototype.text, {
        async apply(target, receiver, args) {
            const text = await Reflect.apply(target, receiver, args);
            return isPlayerResponse(receiver.url) ? pruneText(text) : text;
        }
    });
    const responseCache = new WeakMap();
    for (const property of ["response", "responseText"]) {
        const descriptor = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, property);
        Object.defineProperty(XMLHttpRequest.prototype, property, {
            ...descriptor,
            get() {
                const value = Reflect.apply(descriptor.get, this, []);
                if (!isPlayerResponse(this.responseURL)) return value;
                if (property === "response" && this.responseType === "json") return pruneAds(value);
                if (typeof value !== "string") return value;
                const cached = responseCache.get(this);
                if (cached?.value === value) return cached.text;
                const text = pruneText(value);
                responseCache.set(this, { value, text });
                return text;
            }
        });
    }

    // Inline bootstrap data does not pass through JSON.parse or fetch.
    const descriptor = Object.getOwnPropertyDescriptor(window, "ytInitialPlayerResponse");
    if (!descriptor || (descriptor.configurable && "value" in descriptor)) {
        let response = pruneAds(window.ytInitialPlayerResponse);
        Object.defineProperty(window, "ytInitialPlayerResponse", {
            configurable: true,
            enumerable: descriptor?.enumerable ?? true,
            get: () => response,
            set: value => { response = pruneAds(value); }
        });
    } else {
        pruneAds(window.ytInitialPlayerResponse);
    }

    // shortcut: ads already consumed before injection cannot be removed, reopen the embed after enabling the plugin.
    const args = window.ytplayer?.config?.args;
    if (typeof args?.player_response === "string") args.player_response = pruneText(args.player_response);
})();

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// very loosely based on (but fully rewritten)
// https://github.com/ParticleCore/Iridium/blob/be0acb55146aac60c34eef3fe22f3dda407aa2fa/src/chrome/js/background-inject.js

type AnyObject = Record<PropertyKey, any>;

interface Window {
    fetch: typeof fetch & { original?: typeof fetch; };
}

function findObjectWithPropertyRecursive(obj: AnyObject, key: PropertyKey) {
    if (!obj || typeof obj !== "object") return;

    if (Object.hasOwn(obj, key)) {
        return obj;
    }

    for (const child of Object.values(obj)) {
        if (!child) continue;

        if (Array.isArray(child)) {
            for (const element of child) {
                const result = findObjectWithPropertyRecursive(element, key);
                if (result) {
                    return result;
                }
            }
        } else if (typeof child === "object") {
            const result = findObjectWithPropertyRecursive(child, key);
            if (result) {
                return result;
            }
        }
    }
}

function deleteAds(obj: AnyObject) {
    const adPlacementsParent = findObjectWithPropertyRecursive(obj, "adPlacements");
    const adSlotsParent = findObjectWithPropertyRecursive(obj, "adSlots");
    const playerAdsParent = findObjectWithPropertyRecursive(obj, "playerAds");

    if (adPlacementsParent?.adPlacements) {
        delete adPlacementsParent.adPlacements;
    }
    if (adSlotsParent?.adSlots) {
        delete adSlotsParent.adSlots;
    }
    if (playerAdsParent?.playerAds) {
        delete playerAdsParent.playerAds;
    }
}

const handleResponseKey = Symbol("handleResponse");

Object.defineProperty(Object.prototype, "handleResponse", {
    set(data) {
        this[handleResponseKey] = data;
    },
    get() {
        const original = this[handleResponseKey];
        if (!original) return undefined;

        return function (this: any, _url, _code, response, _callback) {
            if (typeof response === "string" && original?.toString().includes('")]}\'"')) {
                try {
                    const parsed = JSON.parse(response);
                    deleteAds(parsed);
                    arguments[2] = JSON.stringify(parsed);
                } catch {
                    //
                }
            }
            return original.apply(this, arguments);
        };
    }
});


function shouldDeleteAds(data: AnyObject) {
    if (!data) return false;

    const endpoints = data?.onResponseReceivedEndpoints;

    if (Array.isArray(endpoints)) {
        if (endpoints.some(e => e?.reloadContinuationItemsCommand?.targetId === "comments-section"))
            return false;
    }

    return ["contents", "videoDetails", "items", "onResponseReceivedActions", "onResponseReceivedEndpoints", "onResponseReceivedCommands"].some(key => data[key]);
}

const originalFetch = window.fetch?.original || window.fetch;
window.fetch = async function fetch(input, init) {
    const res = await originalFetch(input, init);
    try {
        const text = await res.clone().text();
        const data = JSON.parse(text.replace(")]}'\n", ""));

        if (!shouldDeleteAds(data)) {
            return res;
        }

        deleteAds(data);
        return new Response(JSON.stringify(data));
    } catch (e) {
        return res;
    }
};
window.fetch.original = originalFetch;

let ytInitialData: any;
let ytInitialPlayerResponse: any;

Object.defineProperty(window, "ytInitialData", {
    get() {
        return ytInitialData;
    },
    set(data) {
        deleteAds(data);
        ytInitialData = data;
    },
});

Object.defineProperty(window, "ytInitialPlayerResponse", {
    get() {
        return ytInitialPlayerResponse;
    },
    set(data) {
        deleteAds(data);
        ytInitialPlayerResponse = data;
    }
});

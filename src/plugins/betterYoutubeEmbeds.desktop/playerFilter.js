/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

(() => {
    const installed = Symbol.for("Vencord.YoutubeAdblock");
    if (window[installed]) {
        return;
    }
    window[installed] = true;

    const playerUrl = `${location.origin}/youtubei/v1/player`;
    const adFields = ["adPlacements", "playerAds", "adSlots"];
    const readText = Response.prototype.text;
    const readJson = Response.prototype.json;

    function isPlayerResponse(url) {
        return url === playerUrl || url.startsWith(`${playerUrl}?`);
    }

    function removeAds(data) {
        if (!data || typeof data !== "object") {
            return false;
        }

        let changed = false;
        for (const field of adFields) {
            if (Object.hasOwn(data, field)) {
                delete data[field];
                changed = true;
            }
        }
        return changed;
    }

    Response.prototype.text = async function () {
        const text = await readText.call(this);
        if (!isPlayerResponse(this.url)) {
            return text;
        }

        try {
            const data = JSON.parse(text);
            if (removeAds(data)) {
                return JSON.stringify(data);
            }
        } catch {
            // Let the player handle errors in the original response.
        }

        return text;
    };

    Response.prototype.json = async function () {
        const data = await readJson.call(this);
        if (isPlayerResponse(this.url)) {
            removeAds(data);
        }
        return data;
    };
})();

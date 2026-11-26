/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

(() => {
    const embed = window.ytcfg?.get("PLAYER_VARS")?.embedded_player_response;
    if (typeof embed !== "string") {
        return;
    }

    let playability;
    try {
        playability = JSON.parse(embed).previewPlayabilityStatus;
    } catch {
        return;
    }

    const identityDenied = playability?.errorCode === "PLAYABILITY_ERROR_CODE_EMBEDDER_IDENTITY_DENIED";
    if (location.hostname === "www.youtube-nocookie.com") {
        // Avoid infinite reload loops by only reloading if the referrer is the main YouTube site from below
        if (identityDenied && document.referrer.startsWith("https://www.youtube.com/")) {
            location.reload();
        }
        return;
    }

    const interstitial = playability?.errorScreen?.playerInterstitialRenderer?.content?.interstitialViewModel;
    const embeddingBlocked =
        playability?.status === "UNPLAYABLE" && interstitial?.description?.content?.includes("feature=emb_err_woyt");
    if (identityDenied || embeddingBlocked) {
        const url = new URL(location.href);
        url.hostname = "www.youtube-nocookie.com";
        location.replace(url);
    }
})();

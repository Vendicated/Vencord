/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";

import { settings } from "../../../settings";
import { TidalStore } from "../../TidalStore";
import { getLyrics } from "../api";
import { EnhancedLyric } from "../types";

function showNotif(title: string, body: string) {
    if (settings.store.ShowFailedToasts) {
        showNotification({
            color: "#ee2902",
            title,
            body,
            noPersist: true
        });
    }
}

export const TidalLrcStore = proxyLazyWebpack(() => {
    let lyrics: EnhancedLyric[] | null = null;
    let lastTrackId: string | null = null;

    class TidalLrcStore extends Flux.Store {
        init() { }
        get lyrics() {
            return lyrics;
        }
    }

    const store = new TidalLrcStore(FluxDispatcher);
    function handleTidalStoreChange() {
        const { track } = TidalStore;
        if (!track?.id || lastTrackId === track.id) return;
        lastTrackId = track.id;
        getLyrics(track)
            .then(l => { lyrics = l; store.emitChange(); })
            .catch(() => {
                lyrics = null;
                showNotif("Tidal Lyrics", "Failed to fetch lyrics");
                store.emitChange();
            });
    }

    TidalStore.addChangeListener(handleTidalStoreChange);

    return store;
});

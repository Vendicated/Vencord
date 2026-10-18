/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { IpcMainInvokeEvent } from "electron";


// Listenbrainz does not seem to support CORS. So we have to query it natively..
// Ig, if at some point lastfm starts enforcing CORS, this list could be expanded with lastfm endpoints :3
const staticHosts = [
    "listenbrainz.org",
    "api.listenbrainz.org",
];

// All hosts in staticHosts + the custom self hosted instance, if set.
function getAllowedHosts() {
    const hosts = new Set(staticHosts);

    const pluginSettings = RendererSettings.store.plugins?.MusicRichPresence;
    for (const baseUrl of [pluginSettings?.instanceBaseURL, pluginSettings?.instanceAPIBaseUrl]) {
        // If undefined or wrongly formatted url, dont crash horribly!
        try {
            hosts.add(new URL(baseUrl).hostname);
        } catch { }
    }

    return hosts;
}

// Endpoint argument is untrusted so we have to validate it before using! (https://docs.vencord.dev/plugins/native/)
function validateUrl(url: string) {
    const parsed = new URL(url);

    if (!getAllowedHosts().has(parsed.hostname))
        throw new Error("Invalid endpoint");

    return parsed;
}

export async function fetchJson(_: IpcMainInvokeEvent, url: string) {
    const parsedUrl = validateUrl(url);

    const res = await fetch(parsedUrl);

    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}`);

    return await res.json();
}

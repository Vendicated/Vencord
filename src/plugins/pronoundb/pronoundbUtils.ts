/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Settings } from "@api/Settings";
import { debounce } from "@shared/debounce";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { getCurrentChannel } from "@utils/discord";
import { useAwaiter } from "@utils/react";
import { findStoreLazy } from "@webpack";
import { UserProfileStore, UserStore } from "@webpack/common";

import { settings } from "./settings";
import { CachePronouns, PronounCode, PronounMapping, PronounsResponse } from "./types";

const UserSettingsAccountStore = findStoreLazy("UserSettingsAccountStore");

type PronounsWithSource = [pronouns: string | null, source: string, hasPendingPronouns: boolean];
const EmptyPronouns: PronounsWithSource = [null, "", false];

export const enum PronounsFormat {
    Lowercase = "LOWERCASE",
    Capitalized = "CAPITALIZED"
}

export const enum PronounSource {
    PreferPDB,
    PreferDiscord
}

// A map of cached pronouns so the same request isn't sent twice
const cache: Record<string, CachePronouns> = {};
// A map of ids and callbacks that should be triggered on fetch
const requestQueue: Record<string, ((pronouns: string) => void)[]> = {};

// Executes all queued requests and calls their callbacks
const bulkFetch = debounce(async () => {
    const ids = Object.keys(requestQueue);
    const pronouns = await bulkFetchPronouns(ids);
    for (const id of ids) {
        // Call all callbacks for the id
        requestQueue[id]?.forEach(c => c(pronouns[id] ? extractPronouns(pronouns[id].sets) : ""));
        delete requestQueue[id];
    }
});

function getDiscordPronouns(id: string, useGlobalProfile: boolean = false) {
    const globalPronouns = UserProfileStore.getUserProfile(id)?.pronouns;

    if (useGlobalProfile) return globalPronouns;

    return (
        UserProfileStore.getGuildMemberProfile(id, getCurrentChannel()?.guild_id)?.pronouns
        || globalPronouns
    );
}

export function useFormattedPronouns(id: string, useGlobalProfile: boolean = false): PronounsWithSource {
    // Discord is so stupid you can put tons of newlines in pronouns
    const discordPronouns = getDiscordPronouns(id, useGlobalProfile)?.trim().replace(NewLineRe, " ");

    const [result] = useAwaiter(() => fetchPronouns(id), {
        fallbackValue: getCachedPronouns(id),
        onError: e => console.error("Fetching pronouns failed: ", e)
    });

    const hasPendingPronouns = UserSettingsAccountStore.getPendingPronouns() != null;

    if (settings.store.pronounSource === PronounSource.PreferDiscord && discordPronouns)
        return [discordPronouns, "Discord", hasPendingPronouns];

    if (result && result !== PronounMapping.unspecified)
        return [result, "PronounDB", hasPendingPronouns];

    return [discordPronouns, "Discord", hasPendingPronouns];
}

export function useProfilePronouns(id: string, useGlobalProfile: boolean = false): PronounsWithSource {
    const pronouns = useFormattedPronouns(id, useGlobalProfile);

    if (!settings.store.showInProfile) return EmptyPronouns;
    if (!settings.store.showSelf && id === UserStore.getCurrentUser().id) return EmptyPronouns;

    return pronouns;
}


const NewLineRe = /\n+/g;

// Gets the cached pronouns, if you're too impatient for a promise!
export function getCachedPronouns(id: string): string | null {
    const cached = cache[id] ? extractPronouns(cache[id].sets) : undefined;

    if (cached && cached !== PronounMapping.unspecified) return cached;

    return cached || null;
}

// Fetches the pronouns for one id, returning a promise that resolves if it was cached, or once the request is completed
export function fetchPronouns(id: string): Promise<string> {
    return new Promise(res => {
        const cached = getCachedPronouns(id);
        if (cached) return res(cached);

        // If there is already a request added, then just add this callback to it
        if (id in requestQueue) return requestQueue[id].push(res);

        // If not already added, then add it and call the debounced function to make sure the request gets executed
        requestQueue[id] = [res];
        bulkFetch();
    });
}

async function bulkFetchPronouns(ids: string[]): Promise<PronounsResponse> {
    const params = new URLSearchParams();
    params.append("platform", "discord");
    params.append("ids", ids.join(","));

    try {
        const req = await fetch("https://pronoundb.org/api/v2/lookup?" + params.toString(), {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "X-PronounDB-Source": VENCORD_USER_AGENT
            }
        });
        return await req.json()
            .then((res: PronounsResponse) => {
                Object.assign(cache, res);
                return res;
            });
    } catch (e) {
        // If the request errors, treat it as if no pronouns were found for all ids, and log it
        console.error("PronounDB fetching failed: ", e);
        const dummyPronouns = Object.fromEntries(ids.map(id => [id, { sets: {} }] as const));
        Object.assign(cache, dummyPronouns);
        return dummyPronouns;
    }
}

export function extractPronouns(pronounSet?: { [locale: string]: PronounCode[]; }): string {
    if (!pronounSet || !pronounSet.en) return PronounMapping.unspecified;
    // PronounDB returns an empty set instead of {sets: {en: ["unspecified"]}}.
    const pronouns = pronounSet.en;
    const { pronounsFormat } = Settings.plugins.PronounDB as { pronounsFormat: PronounsFormat, enabled: boolean; };

    if (pronouns.length === 1) {
        // For capitalized pronouns or special codes (any, ask, avoid), we always return the normal (capitalized) string
        if (pronounsFormat === PronounsFormat.Capitalized || ["any", "ask", "avoid", "other", "unspecified"].includes(pronouns[0]))
            return PronounMapping[pronouns[0]];
        else return PronounMapping[pronouns[0]].toLowerCase();
    }
    const pronounString = pronouns.map(p => p[0].toUpperCase() + p.slice(1)).join("/");
    return pronounsFormat === PronounsFormat.Capitalized ? pronounString : pronounString.toLowerCase();
}

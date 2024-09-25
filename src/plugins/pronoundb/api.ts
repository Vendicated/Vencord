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

import { getCurrentChannel } from "@utils/discord";
import { useAwaiter } from "@utils/react";
import { findStoreLazy } from "@webpack";
import { UserProfileStore, UserStore } from "@webpack/common";

import { settings } from "./settings";
import { PronounMapping, Pronouns, PronounsCache, PronounSets, PronounsFormat, PronounSource, PronounsResponse } from "./types";

const UserSettingsAccountStore = findStoreLazy("UserSettingsAccountStore");

const EmptyPronouns = { pronouns: undefined, source: "", hasPendingPronouns: false } as const satisfies Pronouns;

type RequestCallback = (pronounSets?: PronounSets) => void;

const pronounCache: Record<string, PronounsCache> = {};
const requestQueue: Record<string, RequestCallback[]> = {};
let isProcessing = false;

async function processQueue() {
    if (isProcessing) return;
    isProcessing = true;

    let ids = Object.keys(requestQueue);
    while (ids.length > 0) {
        const idsChunk = ids.splice(0, 50);
        const pronouns = await bulkFetchPronouns(idsChunk);

        for (const id of idsChunk) {
            const callbacks = requestQueue[id];
            for (const callback of callbacks) {
                callback(pronouns[id]?.sets);
            }

            delete requestQueue[id];
        }

        ids = Object.keys(requestQueue);
        await new Promise(r => setTimeout(r, 2000));
    }

    isProcessing = false;
}

function fetchPronouns(id: string): Promise<string | undefined> {
    return new Promise(resolve => {
        if (pronounCache[id] != null) {
            resolve(extractPronouns(pronounCache[id].sets));
            return;
        }

        function handlePronouns(pronounSets?: PronounSets) {
            const pronouns = extractPronouns(pronounSets);
            resolve(pronouns);
        }

        if (requestQueue[id] != null) {
            requestQueue[id].push(handlePronouns);
            return;
        }

        requestQueue[id] = [handlePronouns];
        processQueue();
    });
}

async function bulkFetchPronouns(ids: string[]): Promise<PronounsResponse> {
    const params = new URLSearchParams();
    params.append("platform", "discord");
    params.append("ids", ids.join(","));

    try {
        const req = await fetch("https://pronoundb.org/api/v2/lookup?" + String(params), {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "X-PronounDB-Source": "WebExtension/0.14.5"
            }
        });

        if (!req.ok) throw new Error(`Status ${req.status}`);
        const res: PronounsResponse = await req.json();

        Object.assign(pronounCache, res);
        return res;

    } catch (e) {
        console.error("PronounDB request failed:", e);
        const dummyPronouns: PronounsResponse = Object.fromEntries(ids.map(id => [id, { sets: {} }]));

        Object.assign(pronounCache, dummyPronouns);
        return dummyPronouns;
    }
}

function extractPronouns(pronounSets?: PronounSets): string | undefined {
    if (pronounSets == null) return undefined;
    if (pronounSets.en == null) return PronounMapping.unspecified;

    const pronouns = pronounSets.en;
    if (pronouns.length === 0) return PronounMapping.unspecified;

    const { pronounsFormat } = settings.store;

    if (pronouns.length > 1) {
        const pronounString = pronouns.map(p => p[0].toUpperCase() + p.slice(1)).join("/");
        return pronounsFormat === PronounsFormat.Capitalized ? pronounString : pronounString.toLowerCase();
    }

    const pronoun = pronouns[0];
    // For capitalized pronouns or special codes (any, ask, avoid), we always return the normal (capitalized) string
    if (pronounsFormat === PronounsFormat.Capitalized || ["any", "ask", "avoid", "other", "unspecified"].includes(pronoun)) {
        return PronounMapping[pronoun];
    } else {
        return PronounMapping[pronoun].toLowerCase();
    }
}

function getDiscordPronouns(id: string, useGlobalProfile: boolean = false): string | undefined {
    const globalPronouns = UserProfileStore.getUserProfile(id)?.pronouns;
    if (useGlobalProfile) return globalPronouns;

    return UserProfileStore.getGuildMemberProfile(id, getCurrentChannel()?.guild_id)?.pronouns || globalPronouns;
}

export function useFormattedPronouns(id: string, useGlobalProfile: boolean = false): Pronouns {
    const discordPronouns = getDiscordPronouns(id, useGlobalProfile)?.trim().replace(/\n+/g, "");
    const hasPendingPronouns = UserSettingsAccountStore.getPendingPronouns() != null;

    const [pronouns] = useAwaiter(() => fetchPronouns(id));

    if (settings.store.pronounSource === PronounSource.PreferDiscord && discordPronouns) {
        return { pronouns: discordPronouns, source: "Discord", hasPendingPronouns };
    }

    if (pronouns != null && pronouns !== PronounMapping.unspecified) {
        return { pronouns, source: "PronounDB", hasPendingPronouns };
    }

    return { pronouns: discordPronouns, source: "Discord", hasPendingPronouns };
}

export function useProfilePronouns(id: string, useGlobalProfile: boolean = false): Pronouns {
    try {
        const pronouns = useFormattedPronouns(id, useGlobalProfile);

        if (!settings.store.showInProfile) return EmptyPronouns;
        if (!settings.store.showSelf && id === UserStore.getCurrentUser()?.id) return EmptyPronouns;

        return pronouns;
    } catch (e) {
        console.error(e);
        return EmptyPronouns;
    }
}

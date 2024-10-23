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
import { UserProfileStore } from "@webpack/common";
import * as DataStore from "@api/DataStore";

import { PronounsFormat, settings } from "./settings";

const PRONOUNS_CACHE_KEY = "pronounsCache";

async function getCachedPronouns(id: string): Promise<string | undefined> {
    const cache = await DataStore.get<Record<string, { pronouns: string, timestamp: number }>>(PRONOUNS_CACHE_KEY) || {};
    const entry = cache[id];
    if (entry && (Date.now() - entry.timestamp) < 24 * 60 * 60 * 1000) { // 24 hours cache expiry
        return entry.pronouns;
    }
    return undefined;
}

async function setCachedPronouns(id: string, pronouns: string): Promise<void> {
    const cache = await DataStore.get<Record<string, { pronouns: string, timestamp: number }>>(PRONOUNS_CACHE_KEY) || {};
    cache[id] = { pronouns, timestamp: Date.now() };
    await DataStore.set(PRONOUNS_CACHE_KEY, cache);
}

async function fetchAndCachePronouns(id: string, useGlobalProfile: boolean = false): Promise<string | undefined> {
    const globalPronouns: string | undefined = UserProfileStore.getUserProfile(id)?.pronouns;
    const guildPronouns: string | undefined = UserProfileStore.getGuildMemberProfile(id, getCurrentChannel()?.getGuildId())?.pronouns;

    const pronouns = useGlobalProfile ? globalPronouns : guildPronouns || globalPronouns;
    if (pronouns) {
        await setCachedPronouns(id, pronouns);
    }
    return pronouns;
}

async function useDiscordPronouns(id: string, useGlobalProfile: boolean = false): Promise<string | undefined> {
    const cachedPronouns = await getCachedPronouns(id);
    if (cachedPronouns) {
        return cachedPronouns;
    }
    return await fetchAndCachePronouns(id, useGlobalProfile);
}

export async function useFormattedPronouns(id: string, useGlobalProfile: boolean = false): Promise<string | undefined> {
    const pronouns = (await useDiscordPronouns(id, useGlobalProfile))?.trim().replace(/\n+/g, "");
    return settings.store.pronounsFormat === PronounsFormat.Lowercase ? pronouns?.toLowerCase() : pronouns;
}

export { fetchAndCachePronouns };

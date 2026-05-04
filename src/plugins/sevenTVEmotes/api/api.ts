/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import type {
    Emote,
    SevenTVChannel,
    SevenTVEmote,
    SevenTVGraphQLSearchResponse,
    SevenTVUserResponse,
} from "@plugins/sevenTVEmotes/utils/types";

export const SEVEN_TV_API_ORIGIN = "https://7tv.io";
export const SEVEN_TV_CDN_ORIGIN = "https://cdn.7tv.app";
const FAVORITES_KEY = "sevenTVEmotes.favorites";

interface SevenTVSearchEmoteItem {
    id: string;
    defaultName?: string;
}

interface SevenTVSearchResponse {
    data?: {
        search?: {
            all?: {
                emotes?: {
                    items?: SevenTVSearchEmoteItem[];
                };
            };
        };
    };
}

export async function getFavoriteEmotes(): Promise<Emote[]> {
    return (await DataStore.get<Emote[]>(FAVORITES_KEY)) ?? [];
}

export async function setFavoriteEmotes(emotes: Emote[]) {
    await DataStore.set(FAVORITES_KEY, emotes);
}

export async function toggleFavoriteEmote(emote: Emote) {
    const favorites = await getFavoriteEmotes();
    const existingIndex = favorites.findIndex(favorite => favorite.id === emote.id);

    if (existingIndex === -1) {
        favorites.unshift(emote);
    } else {
        favorites.splice(existingIndex, 1);
    }

    await setFavoriteEmotes(favorites);
    return favorites;
}

export async function isFavoriteEmote(emoteId: string) {
    return (await getFavoriteEmotes()).some(favorite => favorite.id === emoteId);
}

interface CachedChannel {
    id: string;
    name: string;
    avatarUrl?: string;
    emotes: Emote[];
}

const channelCache = new Map<string, CachedChannel | null>();
const inflightChannelLoads = new Map<string, Promise<CachedChannel | null>>();
const globalSearchCache = new Map<string, Emote[]>();

export function clear7TVCache() {
    channelCache.clear();
    inflightChannelLoads.clear();
}

export function emoteUrl(id: string, animated: boolean, size: "1x" | "2x" | "4x" = "2x") {
    return `${SEVEN_TV_CDN_ORIGIN}/emote/${id}/${size}.${animated ? "avif" : "webp"}`;
}

export const formatEmote = (emoteId: string) => emoteUrl(emoteId, false, "2x");

async function searchEmotes(query: string, perPage = 5): Promise<SevenTVSearchEmoteItem[] | null> {
    try {
        const response = await fetch(`${SEVEN_TV_API_ORIGIN}/v4/gql`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                operationName: "SearchEmote",
                query: `
                    query SearchEmote($query: String!, $perPage: Int!) {
                        search {
                            all(query: $query, page: 1, perPage: $perPage) {
                                emotes {
                                    items {
                                        id
                                        defaultName
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: { query, perPage },
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as SevenTVSearchResponse;
        return data.data?.search?.all?.emotes?.items ?? null;
    } catch (error) {
        console.error("Error searching for emotes:", error);
        return null;
    }
}

function getMatchScore(emoteName: string, query: string): number {
    const name = emoteName.toLowerCase();
    const q = query.toLowerCase();

    if (name === q) return 1000;

    if (name.startsWith(q)) return 500;

    if (name.includes(q)) return 300;

    let queryIdx = 0;
    for (let i = 0; i < name.length && queryIdx < q.length; i++) {
        if (name[i] === q[queryIdx]) queryIdx++;
    }
    if (queryIdx === q.length) return 200;

    return 0;
}

function findBestEmote(emotes: Emote[], query: string): Emote | null {
    if (!emotes.length) return null;

    let best = emotes[0];
    let bestScore = getMatchScore(best.name, query);

    for (const emote of emotes) {
        const score = getMatchScore(emote.name, query);
        if (score > bestScore) {
            best = emote;
            bestScore = score;
        }
    }

    return bestScore > 0 ? best : null;
}

export async function emoteSearchReplacer(message: string): Promise<string> {
    try {
        const query = message.trim();
        if (!query) return "";

        const favorites = await getFavoriteEmotes();
        const favoriteMatch = findBestEmote(favorites, query);
        if (favoriteMatch && getMatchScore(favoriteMatch.name, query) >= 200) {
            return formatEmote(favoriteMatch.id);
        }

        const { settings } = await import("@plugins/sevenTVEmotes/utils/settings");
        const channelsConfig = (settings.store.channels as string).split(",").map(c => c.trim()).filter(Boolean);
        if (channelsConfig.length > 0) {
            const channels = await load7TVChannels(channelsConfig);
            for (const channel of channels) {
                const channelMatch = findBestEmote(channel.emotes, query);
                if (channelMatch && getMatchScore(channelMatch.name, query) >= 200) {
                    return formatEmote(channelMatch.id);
                }
            }
        }

        const globalResults = await searchGlobalEmotes(query, 5);
        const globalMatch = findBestEmote(globalResults, query);
        if (globalMatch) {
            return formatEmote(globalMatch.id);
        }

        return "";
    } catch (error) {
        console.error("Error replacing emote:", error);
        return "";
    }
}

export async function searchGlobalEmotes(query: string, perPage = 100): Promise<Emote[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const cached = globalSearchCache.get(normalized);
    if (cached) return cached;

    const results = await searchEmotes(query, perPage);
    const mapped = results?.map(item => ({
        id: item.id,
        name: item.defaultName ?? query,
        animated: false,
    })) ?? [];

    globalSearchCache.set(normalized, mapped);
    return mapped;
}

async function resolveUserId(input: string): Promise<string> {
    const normalized = input.trim();
    if (!normalized) return input;

    try {
        const res = await fetch(`${SEVEN_TV_API_ORIGIN}/v3/users/${encodeURIComponent(normalized)}`);
        if (res.ok) {
            const data = await res.json();
            return data?.id ?? normalized;
        }
    } catch { }

    try {
        const res = await fetch(`${SEVEN_TV_API_ORIGIN}/v3/gql`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                operationName: "SearchUsers",
                query: "query SearchUsers($query:String!){users(query:$query){id username display_name}}",
                variables: { query: normalized },
            }),
        });
        if (res.ok) {
            const data: SevenTVGraphQLSearchResponse = await res.json();
            const lower = normalized.toLowerCase();
            const user = data.data?.users?.find(u =>
                u.username?.toLowerCase() === lower || u.display_name?.toLowerCase() === lower
            );
            if (user?.id) return user.id;
        }
    } catch { }

    return normalized;
}

function addEmotes(source: SevenTVEmote[] | undefined, seen: Set<string>, all: Emote[]) {
    source?.forEach(e => {
        if (seen.has(e.id)) return;
        seen.add(e.id);
        all.push({ id: e.id, name: e.name, animated: e.data?.animated ?? false });
    });
}

function getChannelEmotes(data: SevenTVUserResponse) {
    const all: Emote[] = [];
    const seen = new Set<string>();

    if (data.emote_set?.emotes?.length) {
        addEmotes(data.emote_set.emotes, seen, all);
        return all;
    }

    const connection = data.connections?.find(c => c.emote_set?.emotes?.length);
    addEmotes(connection?.emote_set?.emotes, seen, all);
    return all;
}

function getCacheKey(raw: string) {
    return raw.trim().toLowerCase();
}

async function loadSingleChannel(raw: string): Promise<CachedChannel | null> {
    try {
        const id = await resolveUserId(raw.trim());
        const res = await fetch(`${SEVEN_TV_API_ORIGIN}/v3/users/${id}`);
        if (!res.ok) return null;

        const data: SevenTVUserResponse = await res.json();
        return {
            id: data.id ?? id,
            name: data.display_name ?? data.username ?? raw,
            avatarUrl: data.avatar_url,
            emotes: getChannelEmotes(data),
        };
    } catch {
        return null;
    }
}

async function loadSingleChannelCached(raw: string): Promise<CachedChannel | null> {
    const cacheKey = getCacheKey(raw);
    if (!cacheKey) return null;

    if (channelCache.has(cacheKey)) {
        return channelCache.get(cacheKey) ?? null;
    }

    const inflight = inflightChannelLoads.get(cacheKey);
    if (inflight) return inflight;

    const request = loadSingleChannel(raw).then(channel => {
        channelCache.set(cacheKey, channel);
        inflightChannelLoads.delete(cacheKey);
        return channel;
    });

    inflightChannelLoads.set(cacheKey, request);
    return request;
}

export async function load7TVChannels(userIds: string[]): Promise<SevenTVChannel[]> {
    const results: Array<SevenTVChannel | null> = await Promise.all(userIds.map(async (raw, index) => {
        const channel = await loadSingleChannelCached(raw);
        if (!channel) return null;

        return {
            key: `${channel.id}:${index}`,
            id: channel.id,
            name: channel.name,
            avatarUrl: channel.avatarUrl,
            emotes: channel.emotes,
        };
    }));

    return results.filter((channel): channel is SevenTVChannel => channel !== null);
}

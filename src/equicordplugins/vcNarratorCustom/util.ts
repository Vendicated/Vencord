/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const VOICE_OPTIONS = [
    { label: "Asian: Indonesian Female (id_001)", value: "id_001" },
    { label: "Asian: Japanese Female 1 (jp_001)", value: "jp_001" },
    { label: "Asian: Japanese Female 2 (jp_003)", value: "jp_003" },
    { label: "Asian: Japanese Female 3 (jp_005)", value: "jp_005" },
    { label: "Asian: Japanese Male (jp_006)", value: "jp_006" },
    { label: "Asian: Korean Female (kr_003)", value: "kr_003" },
    { label: "Asian: Korean Male 1 (kr_002)", value: "kr_002" },
    { label: "Asian: Korean Male 2 (kr_004)", value: "kr_004" },
    { label: "English: AU Female (en_au_001)", value: "en_au_001" },
    { label: "English: AU Male (en_au_002)", value: "en_au_002" },
    { label: "English: Funny (en_male_funny)", value: "en_male_funny" },
    { label: "English: Narrator (en_male_narration)", value: "en_male_narration" },
    { label: "English: Peaceful (en_female_emotional)", value: "en_female_emotional" },
    { label: "English: Serious (en_male_cody)", value: "en_male_cody" },
    { label: "English: UK Male 1 (en_uk_001)", value: "en_uk_001" },
    { label: "English: UK Male 2 (en_uk_003)", value: "en_uk_003" },
    { label: "English: US Female 1 (en_us_001)", value: "en_us_001" },
    { label: "English: US Female 2 (en_us_002)", value: "en_us_002" },
    { label: "English: US Male 1 (en_us_006)", value: "en_us_006" },
    { label: "English: US Male 2 (en_us_007)", value: "en_us_007" },
    { label: "English: US Male 3 (en_us_009)", value: "en_us_009" },
    { label: "English: US Male 4 (en_us_010)", value: "en_us_010" },
    { label: "European: French Male 1 (fr_001)", value: "fr_001" },
    { label: "European: French Male 2 (fr_002)", value: "fr_002" },
    { label: "European: German Female (de_001)", value: "de_001" },
    { label: "European: German Male (de_002)", value: "de_002" },
    { label: "European: Italian Male (it_male_m18)", value: "it_male_m18" },
    { label: "European: Spanish Male (es_002)", value: "es_002" },
    { label: "Fun: C3PO (en_us_c3po)", value: "en_us_c3po" },
    { label: "Fun: Chewbacca (en_us_chewbacca)", value: "en_us_chewbacca" },
    { label: "Fun: Ghost Face (en_us_ghostface)", value: "en_us_ghostface" },
    { label: "Fun: Ghost Host (en_male_ghosthost)", value: "en_male_ghosthost" },
    { label: "Fun: Madame Leota (en_female_madam_leota)", value: "en_female_madam_leota" },
    { label: "Fun: Pirate (en_male_pirate)", value: "en_male_pirate" },
    { label: "Fun: Rocket (en_us_rocket)", value: "en_us_rocket" },
    { label: "Fun: Stitch (en_us_stitch)", value: "en_us_stitch" },
    { label: "Fun: Stormtrooper (en_us_stormtrooper)", value: "en_us_stormtrooper" },
    { label: "Latin American: Portuguese BR Female 1 (br_001)", value: "br_001" },
    { label: "Latin American: Portuguese BR Female 2 (br_003)", value: "br_003" },
    { label: "Latin American: Portuguese BR Female 3 (br_004)", value: "br_004" },
    { label: "Latin American: Portuguese BR Male (br_005)", value: "br_005" },
    { label: "Latin American: Spanish MX Male (es_mx_002)", value: "es_mx_002" },
];

export const ttsCache = new Map<string, string>();

export const PERSISTENT_TTS_CACHE_MAX_BYTES = 100 * 1024 * 1024;

export function parseUserVoiceMap(input?: string): Map<string, string> {
    const map = new Map<string, string>();
    const trimmed = input?.trim();
    if (!trimmed) return map;

    if (trimmed.includes(":") || trimmed.includes("=")) {
        for (const entry of trimmed.split(",").map(s => s.trim()).filter(Boolean)) {
            const [userId, voiceId] = entry.split(/[:=]/).map(s => s.trim());
            if (userId && voiceId) map.set(userId, voiceId);
        }
        return map;
    }

    for (const line of trimmed.split(/\n+/)) {
        const [userId, voiceId] = line.split(",").map(s => s.trim());
        if (userId && voiceId) map.set(userId, voiceId);
    }

    return map;
}

export function serializeUserVoiceMap(map: Map<string, string>): string {
    return Array.from(map.entries())
        .map(([userId, voiceId]) => `${userId}:${voiceId}`)
        .join(",");
}

export function getVoiceForUser(
    userId: string | undefined,
    options: { userVoiceMap?: string; customVoice?: string; defaultVoice?: string; }
): string {
    const defaultVoice = options.customVoice ?? options.defaultVoice ?? "en_us_001";
    if (!userId) return defaultVoice;
    const map = parseUserVoiceMap(options.userVoiceMap ?? "");
    return map.get(userId) ?? defaultVoice;
}

export function upsertUserVoiceMap(userVoiceMap: string | undefined, userId: string, voiceId: string): string {
    const map = parseUserVoiceMap(userVoiceMap ?? "");
    map.set(userId, voiceId);
    return serializeUserVoiceMap(map);
}

export function removeUserVoiceFromMap(userVoiceMap: string | undefined, userId: string): string {
    const map = parseUserVoiceMap(userVoiceMap ?? "");
    map.delete(userId);
    return serializeUserVoiceMap(map);
}

export function parseUserIdList(input?: string): Set<string> {
    const set = new Set<string>();
    const trimmed = input?.trim();
    if (!trimmed) return set;

    for (const entry of trimmed.split(",").map(s => s.trim()).filter(Boolean)) {
        set.add(entry);
    }

    return set;
}

export function serializeUserIdList(list: Set<string>): string {
    return Array.from(list).join(",");
}

export function addUserToList(input: string | undefined, userId: string): string {
    const set = parseUserIdList(input);
    set.add(userId);
    return serializeUserIdList(set);
}

export function removeUserFromList(input: string | undefined, userId: string): string {
    const set = parseUserIdList(input);
    set.delete(userId);
    return serializeUserIdList(set);
}

export function parseStateChangeFilterList(input?: string): Set<string> {
    const set = new Set<string>();
    const trimmed = input?.trim();
    if (!trimmed) return set;

    for (const entry of trimmed.split(",").map(s => s.trim()).filter(Boolean)) {
        set.add(entry);
    }

    return set;
}

export function serializeStateChangeFilterList(list: Set<string>): string {
    return Array.from(list).join(",");
}

export function addUserToStateChangeFilterList(input: string | undefined, userId: string): string {
    const set = parseStateChangeFilterList(input);
    set.add(userId);
    return serializeStateChangeFilterList(set);
}

export function removeUserFromStateChangeFilterList(input: string | undefined, userId: string): string {
    const set = parseStateChangeFilterList(input);
    set.delete(userId);
    return serializeStateChangeFilterList(set);
}

export function clean(str: string, latinOnly?: boolean) {
    const replacer = latinOnly
        ? /[^\p{Script=Latin}\p{Number}\p{Punctuation}\s]/gu
        : /[^\p{Letter}\p{Number}\p{Punctuation}\s]/gu;

    return str
        .normalize("NFKC")
        .replace(replacer, "")
        .replace(/_{2,}/g, "_")
        .trim()
        .slice(0, 128);
}

export function formatText(
    str: string,
    user: string,
    channel: string,
    displayName: string,
    nickname: string,
    latinOnly?: boolean
) {
    return str
        .replaceAll("{{USER}}", clean(user, latinOnly) || (user ? "Someone" : ""))
        .replaceAll("{{CHANNEL}}", clean(channel, latinOnly) || "channel")
        .replaceAll(
            "{{DISPLAY_NAME}}",
            clean(displayName, latinOnly) || (displayName ? "Someone" : "")
        )
        .replaceAll(
            "{{NICKNAME}}",
            clean(nickname, latinOnly) || (nickname ? "Someone" : "")
        );
}

const DB_NAME = "VcNarratorDB";

const DB_VERSION = 2;

const VOICES_STORE = "voices";

const META_STORE = "voices_meta";

type VoiceMeta = {
    size: number;
    createdAt: number;
    lastAccess: number;
};

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = event => {
            const db = request.result;
            const upgradeTx = request.transaction;
            if (!db.objectStoreNames.contains(VOICES_STORE)) {
                db.createObjectStore(VOICES_STORE);
            }
            if (!db.objectStoreNames.contains(META_STORE)) {
                const meta = db.createObjectStore(META_STORE);
                meta.createIndex("by_lastAccess", "lastAccess");
            }

            if (upgradeTx && (event?.oldVersion ?? 0) < 2) {
                const now = Date.now();
                const voices = upgradeTx.objectStore(VOICES_STORE);
                const meta = upgradeTx.objectStore(META_STORE);
                const cursorReq = voices.openCursor();
                cursorReq.onsuccess = () => {
                    const cursor = cursorReq.result;
                    if (!cursor) return;
                    const blob = cursor.value as Blob | undefined;
                    meta.put(
                        {
                            size: blob?.size ?? 0,
                            createdAt: now,
                            lastAccess: now,
                        } satisfies VoiceMeta,
                        String(cursor.key)
                    );
                    cursor.continue();
                };
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getPersistentTtsCacheStats(): Promise<{ bytes: number; entries: number; }> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, "readonly");
        const store = tx.objectStore(META_STORE);

        let bytes = 0;
        let entries = 0;

        const cursorReq = store.openCursor();
        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor) {
                resolve({ bytes, entries });
                return;
            }
            const meta = cursor.value as VoiceMeta | undefined;
            if (meta?.size) bytes += meta.size;
            entries++;
            cursor.continue();
        };
        cursorReq.onerror = () => reject(cursorReq.error);
    });
}

export async function clearTtsCache(): Promise<void> {
    for (const url of ttsCache.values()) {
        try {
            URL.revokeObjectURL(url);
        } catch { }
    }
    ttsCache.clear();

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([VOICES_STORE, META_STORE], "readwrite");
        tx.objectStore(VOICES_STORE).clear();
        tx.objectStore(META_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function trimPersistentCacheToMaxBytes(maxBytes = PERSISTENT_TTS_CACHE_MAX_BYTES): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([VOICES_STORE, META_STORE], "readwrite");
        const voicesStore = tx.objectStore(VOICES_STORE);
        const metaStore = tx.objectStore(META_STORE);
        const lastAccessIndex = metaStore.index("by_lastAccess");

        let totalBytes = 0;
        const sumReq = metaStore.openCursor();

        const deleteOldestUntilOk = () => {
            if (totalBytes <= maxBytes) return;

            const oldestReq = lastAccessIndex.openCursor();
            oldestReq.onsuccess = () => {
                const cursor = oldestReq.result;
                if (!cursor) return;

                const cacheKey = String(cursor.primaryKey);
                const meta = cursor.value as VoiceMeta | undefined;
                const metaSize = meta?.size ?? 0;

                const inMemoryUrl = ttsCache.get(cacheKey);
                if (inMemoryUrl) {
                    try {
                        URL.revokeObjectURL(inMemoryUrl);
                    } catch { }
                    ttsCache.delete(cacheKey);
                }

                voicesStore.delete(cacheKey);
                const deleteMetaReq = metaStore.delete(cacheKey);
                deleteMetaReq.onsuccess = () => {
                    totalBytes -= metaSize;
                    deleteOldestUntilOk();
                };
                deleteMetaReq.onerror = () => deleteOldestUntilOk();
            };
        };

        sumReq.onsuccess = () => {
            const cursor = sumReq.result;
            if (cursor) {
                const meta = cursor.value as VoiceMeta | undefined;
                totalBytes += meta?.size ?? 0;
                cursor.continue();
                return;
            }
            deleteOldestUntilOk();
        };
        sumReq.onerror = () => reject(sumReq.error);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getCachedVoiceFromDB(cacheKey: string): Promise<Blob | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([VOICES_STORE, META_STORE], "readwrite");
        const voicesStore = tx.objectStore(VOICES_STORE);
        const metaStore = tx.objectStore(META_STORE);
        const request = voicesStore.get(cacheKey);

        request.onsuccess = () => {
            const blob = (request.result as Blob | undefined) ?? null;
            if (blob) {
                const now = Date.now();
                const metaGetReq = metaStore.get(cacheKey);
                metaGetReq.onsuccess = () => {
                    const existing = metaGetReq.result as VoiceMeta | undefined;
                    const updated: VoiceMeta = {
                        size: existing?.size ?? blob.size,
                        createdAt: existing?.createdAt ?? now,
                        lastAccess: now,
                    };
                    metaStore.put(updated, cacheKey);
                };
            }
            resolve(blob);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function setCachedVoiceInDB(cacheKey: string, blob: Blob): Promise<void> {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([VOICES_STORE, META_STORE], "readwrite");
        const voicesStore = tx.objectStore(VOICES_STORE);
        const metaStore = tx.objectStore(META_STORE);

        const now = Date.now();
        voicesStore.put(blob, cacheKey);
        metaStore.put(
            { size: blob.size, createdAt: now, lastAccess: now } satisfies VoiceMeta,
            cacheKey
        );

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });

    await trimPersistentCacheToMaxBytes();
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 satanas and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Logger } from "@utils/Logger";
import { AuthenticationStore } from "@webpack/common";

import { settings } from "./settings";

export interface TypingConfig {
    /** Template with a {user} placeholder */
    text?: string;
    /** Up to 3 emoji, one per dot */
    emojis?: string[];
}

const logger = new Logger("TypingCustomizer");

const CACHE_KEY = "typingCustomizer-configs";
const CACHE_TTL = 10 * 60_000;
const RETRY_DELAY = 60_000;
const MAX_TEXT_LENGTH = 150;
const MAX_EMOJI_LENGTH = 32;

interface CacheEntry {
    config: TypingConfig | null;
    /** Timestamp from which the entry should be fetched again */
    nextFetchAt: number;
    fetching?: boolean;
}

const configs = new Map<string, CacheEntry>();

let saveTimer: ReturnType<typeof setTimeout> | undefined;

function saveCache() {
    if (saveTimer != null) return;

    saveTimer = setTimeout(() => {
        saveTimer = undefined;

        const plain: Record<string, TypingConfig> = {};
        for (const [userId, { config }] of configs) {
            if (config) plain[userId] = config;
        }

        DataStore.set(CACHE_KEY, plain).catch(e => logger.debug("Failed to save the indicators cache", e));
    }, 2_000);
}

function getBaseUrl() {
    return settings.store.baseUrl.trim().replace(/\/+$/, "");
}

function isConfigSet(config: TypingConfig | null | undefined): config is TypingConfig {
    return config != null && (!!config.text || !!config.emojis?.length);
}

function sanitize(raw: any): TypingConfig {
    const config: TypingConfig = {};

    if (typeof raw?.text === "string") {
        const text = raw.text.replace(/[\r\n\t]+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
        if (text) config.text = text;
    }

    if (Array.isArray(raw?.emojis)) {
        const emojis = raw.emojis
            .filter((emoji: unknown) => typeof emoji === "string" && emoji.length > 0 && emoji.length <= MAX_EMOJI_LENGTH)
            .slice(0, 3);

        if (emojis.length) config.emojis = emojis;
    }

    return config;
}

async function fetchConfig(userId: string) {
    const entry = configs.get(userId);
    if (entry?.fetching) return;

    const baseUrl = getBaseUrl();
    if (!baseUrl) return;

    configs.set(userId, { config: entry?.config ?? null, nextFetchAt: entry?.nextFetchAt ?? 0, fetching: true });

    try {
        const res = await fetch(`${baseUrl}/${encodeURIComponent(userId)}.json`);

        if (res.status === 404) {
            configs.set(userId, { config: null, nextFetchAt: Date.now() + CACHE_TTL });
            saveCache();
            return;
        }

        if (!res.ok) throw new Error(`The indicator service answered ${res.status}`);

        const config = sanitize(await res.json());
        configs.set(userId, { config: isConfigSet(config) ? config : null, nextFetchAt: Date.now() + CACHE_TTL });
        saveCache();
    } catch (e) {
        logger.debug(`Failed to load the indicator of ${userId}`, e);
        configs.set(userId, { config: entry?.config ?? null, nextFetchAt: Date.now() + RETRY_DELAY });
    }
}

export function getConfigFor(userId: string): TypingConfig | null {
    if (!userId) return null;

    const entry = configs.get(userId);
    if (!entry || entry.nextFetchAt <= Date.now()) void fetchConfig(userId);

    return entry?.config ?? null;
}

export async function initSync() {
    try {
        const cached = await DataStore.get<Record<string, TypingConfig>>(CACHE_KEY);
        for (const [userId, raw] of Object.entries(cached ?? {})) {
            const config = sanitize(raw);
            if (isConfigSet(config)) configs.set(userId, { config, nextFetchAt: 0 });
        }
    } catch (e) {
        logger.error("Failed to load the cached indicators", e);
    }
}

export function onTypingStart({ userId }: { userId?: string; }) {
    if (!userId || userId === AuthenticationStore.getId()) return;

    // Warm the cache so the indicator is already customised on its next render
    getConfigFor(userId);
}

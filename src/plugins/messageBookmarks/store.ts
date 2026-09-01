/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

import * as DataStore from "@api/DataStore";
import { useAwaiter } from "@utils/react";
import { Message } from "@vencord/discord-types";
import { GuildMemberStore, useEffect, useReducer, UserStore } from "@webpack/common";
import type { DispatchWithoutAction } from "react";

export interface MessageBookmark {
    messageId: string;
    channelId: string;
    guildId?: string;
    authorId: string;
    authorName?: string;
    preview: string;
    timestamp: number;
}

interface MessageBookmarksStore {
    version: 1;
    bookmarks: MessageBookmark[];
}

const DATA_KEY = "MessageBookmarks_store";
const STORE_VERSION = 1;
const PREVIEW_LIMIT = 200;

const listeners = new Set<DispatchWithoutAction>();

let bookmarksCache: MessageBookmarksStore | null = null;
let bookmarksPromise: Promise<MessageBookmarksStore> | null = null;
let bookmarkedMessageIds = new Set<string>();
let hasLoadedIndex = false;

function emitChange() {
    listeners.forEach(listener => listener());
}

function syncCache(store: MessageBookmarksStore) {
    bookmarksCache = {
        version: STORE_VERSION,
        bookmarks: [...store.bookmarks]
    };
    bookmarkedMessageIds = new Set(store.bookmarks.map(bookmark => bookmark.messageId));
    hasLoadedIndex = true;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === "object";
}

function parseBookmark(value: unknown): MessageBookmark | null {
    if (!isObject(value)) return null;

    const { messageId, channelId, guildId, authorId, authorName, preview, timestamp } = value;
    if (typeof messageId !== "string" || typeof channelId !== "string" || typeof authorId !== "string") return null;
    if (guildId != null && typeof guildId !== "string") return null;
    if (authorName != null && typeof authorName !== "string") return null;
    if (typeof preview !== "string" || typeof timestamp !== "number" || !Number.isFinite(timestamp)) return null;

    return {
        messageId,
        channelId,
        guildId: guildId ?? undefined,
        authorId,
        authorName: authorName ?? undefined,
        preview: truncatePreview(preview),
        timestamp
    };
}

function normalizeStore(value: unknown): MessageBookmarksStore {
    if (!isObject(value)) {
        return {
            version: STORE_VERSION,
            bookmarks: []
        };
    }

    const rawBookmarks = Array.isArray(value.bookmarks) ? value.bookmarks : [];
    const seen = new Set<string>();
    const bookmarks = rawBookmarks
        .map(parseBookmark)
        .filter((bookmark): bookmark is MessageBookmark => bookmark != null)
        .filter(bookmark => {
            if (seen.has(bookmark.messageId)) return false;
            seen.add(bookmark.messageId);
            return true;
        })
        .sort((a, b) => b.timestamp - a.timestamp);

    return {
        version: STORE_VERSION,
        bookmarks
    };
}

function getAuthorName(message: Message, guildId?: string) {
    const cachedUser = UserStore.getUser(message.author.id) ?? message.author;
    return guildId
        ? GuildMemberStore.getNick(guildId, message.author.id) ?? cachedUser.globalName ?? cachedUser.username
        : cachedUser.globalName ?? cachedUser.username;
}

function getMessageText(message: Message) {
    return message.content
        || message.messageSnapshots?.[0]?.message.content
        || message.embeds.find(embed => embed.type === "auto_moderation_message")?.rawDescription
        || message.embeds[0]?.rawDescription
        || message.embeds[0]?.rawTitle
        || message.attachments[0]?.filename
        || message.stickerItems[0]?.name
        || "";
}

function truncatePreview(value: string) {
    const preview = value.replace(/\s+/g, " ").trim();
    if (preview.length <= PREVIEW_LIMIT) return preview;

    return preview.slice(0, PREVIEW_LIMIT - 3).trimEnd() + "...";
}

function createBookmark(message: Message, guildId?: string): MessageBookmark {
    const date = new Date(message.timestamp);

    return {
        messageId: message.id,
        channelId: message.channel_id,
        guildId,
        authorId: message.author.id,
        authorName: getAuthorName(message, guildId),
        preview: truncatePreview(getMessageText(message)),
        timestamp: Number.isNaN(date.getTime()) ? Date.now() : date.getTime()
    };
}

async function loadStore() {
    if (bookmarksCache) return bookmarksCache;
    if (bookmarksPromise) return bookmarksPromise;

    bookmarksPromise = DataStore.get<MessageBookmarksStore>(DATA_KEY)
        .then(store => {
            const normalized = normalizeStore(store);
            syncCache(normalized);
            return normalized;
        })
        .finally(() => {
            bookmarksPromise = null;
        });

    return bookmarksPromise;
}

export async function loadBookmarkIndex() {
    if (hasLoadedIndex) return;
    await loadStore();
}

export function isMessageBookmarked(messageId: string) {
    return bookmarkedMessageIds.has(messageId);
}

export function didLoadBookmarkIndex() {
    return hasLoadedIndex;
}

export async function getBookmarks() {
    const store = await loadStore();
    return [...store.bookmarks];
}

export async function addBookmark(message: Message, guildId?: string) {
    let result!: "added" | "duplicate";
    let nextStore!: MessageBookmarksStore;

    await DataStore.update(DATA_KEY, oldStore => {
        const store = normalizeStore(oldStore);
        if (store.bookmarks.some(bookmark => bookmark.messageId === message.id)) {
            result = "duplicate";
            nextStore = store;
            return store;
        }

        nextStore = {
            version: STORE_VERSION,
            bookmarks: [createBookmark(message, guildId), ...store.bookmarks].sort((a, b) => b.timestamp - a.timestamp)
        };
        result = "added";
        return nextStore;
    });

    syncCache(nextStore);
    if (result === "added") emitChange();

    return result;
}

export async function removeBookmark(messageId: string) {
    let removed = false;
    let nextStore!: MessageBookmarksStore;

    await DataStore.update(DATA_KEY, oldStore => {
        const store = normalizeStore(oldStore);
        nextStore = {
            version: STORE_VERSION,
            bookmarks: store.bookmarks.filter(bookmark => {
                const keep = bookmark.messageId !== messageId;
                removed ||= !keep;
                return keep;
            })
        };

        return nextStore;
    });

    syncCache(nextStore);
    if (removed) emitChange();

    return removed;
}

export async function clearBookmarks() {
    let hadBookmarks = false;
    let nextStore!: MessageBookmarksStore;

    await DataStore.update(DATA_KEY, oldStore => {
        const store = normalizeStore(oldStore);
        hadBookmarks = store.bookmarks.length > 0;
        nextStore = {
            version: STORE_VERSION,
            bookmarks: []
        };
        return nextStore;
    });

    syncCache(nextStore);
    if (hadBookmarks) emitChange();

    return hadBookmarks;
}

export function useBookmarks() {
    const [signal, setSignal] = useReducer(value => value + 1, 0);

    useEffect(() => {
        listeners.add(setSignal);
        return () => void listeners.delete(setSignal);
    }, []);

    return useAwaiter(getBookmarks, {
        fallbackValue: [],
        deps: [signal]
    });
}

export function resetBookmarksStore() {
    listeners.clear();
    bookmarksCache = null;
    bookmarksPromise = null;
    bookmarkedMessageIds.clear();
    hasLoadedIndex = false;
}

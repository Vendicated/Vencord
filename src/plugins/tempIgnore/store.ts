/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export interface IgnoredUser {
    userId: string;
    username: string;
    expiresAt: number; // Unix timestamp in ms
    ignoredAt: number; // Unix timestamp in ms
}

export const settings = definePluginSettings({
    ignoredUsersJson: {
        type: OptionType.STRING,
        description: "JSON data for temporarily ignored users (do not edit manually)",
        default: "{}",
        hidden: true,
    },
    showExpiryToast: {
        type: OptionType.BOOLEAN,
        description: "Show a toast notification when a temp-ignore expires",
        default: true,
    },
    hideMessages: {
        type: OptionType.BOOLEAN,
        description: "Hide messages from temp-ignored users in server channels",
        default: true,
    },
    hideDMs: {
        type: OptionType.BOOLEAN,
        description: "Hide DM channels with temp-ignored users",
        default: true,
    },
    hidePresence: {
        type: OptionType.BOOLEAN,
        description: "Hide status/presence of temp-ignored users (show as offline)",
        default: true,
    },
    hideFriendList: {
        type: OptionType.BOOLEAN,
        description: "Hide temp-ignored users from the friend list",
        default: true,
    },
    hideVoice: {
        type: OptionType.BOOLEAN,
        description: "Hide temp-ignored users from voice channel member lists",
        default: true,
    },
});

// ── In-memory cache (synced to settings on every write) ──

let ignoredUsersCache: Record<string, IgnoredUser> = {};

/**
 * Load the persisted JSON into the memory cache.
 * Call once on plugin start.
 */
export function loadIgnoredUsers(): void {
    try {
        ignoredUsersCache = JSON.parse(settings.store.ignoredUsersJson || "{}");
    } catch {
        ignoredUsersCache = {};
    }
}

/** Flush cache → settings store */
function persist(): void {
    settings.store.ignoredUsersJson = JSON.stringify(ignoredUsersCache);
}

/** Add a user to the ignore list with a given duration in milliseconds. */
export function addIgnoredUser(userId: string, username: string, durationMs: number): void {
    const now = Date.now();
    ignoredUsersCache[userId] = {
        userId,
        username,
        ignoredAt: now,
        expiresAt: now + durationMs,
    };
    persist();
}

/** Remove a user from the ignore list. */
export function removeIgnoredUser(userId: string): void {
    delete ignoredUsersCache[userId];
    persist();
}

/** Check whether a user is currently temp-ignored. */
export function isIgnored(userId: string): boolean {
    const entry = ignoredUsersCache[userId];
    if (!entry) return false;
    if (Date.now() >= entry.expiresAt) {
        // Expired — clean up lazily
        removeIgnoredUser(userId);
        return false;
    }
    return true;
}

/** Get the full ignored-user entry (or undefined). */
export function getIgnoredUser(userId: string): IgnoredUser | undefined {
    return ignoredUsersCache[userId];
}

/** Return all currently ignored users (does NOT clean expired). */
export function getAllIgnoredUsers(): Record<string, IgnoredUser> {
    return { ...ignoredUsersCache };
}

/** Remove all expired entries. Returns an array of usernames that were unignored. */
export function cleanupExpired(): string[] {
    const now = Date.now();
    const expired: string[] = [];

    for (const [userId, entry] of Object.entries(ignoredUsersCache)) {
        if (now >= entry.expiresAt) {
            expired.push(entry.username);
            delete ignoredUsersCache[userId];
        }
    }

    if (expired.length > 0) persist();
    return expired;
}

/** Human-readable remaining time string. */
export function getTimeRemaining(userId: string): string {
    const entry = ignoredUsersCache[userId];
    if (!entry) return "not ignored";

    const remaining = entry.expiresAt - Date.now();
    if (remaining <= 0) return "expired";

    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    if (hours > 0) return `${hours}h ${minutes % 60}m remaining`;
    if (minutes > 0) return `${minutes}m remaining`;
    return `${seconds}s remaining`;
}

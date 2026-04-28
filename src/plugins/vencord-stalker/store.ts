/* eslint-disable simple-header/header */
/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
import { showNotification } from "@api/Notifications";
import { PluginNative } from "@utils/types";

import { getRetentionCutoffMs, getWhitelistedIds } from "./settings";
import { PresenceLogEntry, ProfileSnapshot, UserStalkerConfig } from "./types";
import { formatTimestamp, getDurationLabel, logger } from "./utils";

const Native = VencordNative.pluginHelpers.Stalker as PluginNative<typeof import("./native")>;

// Storage keys
const lastOfflineStoreKey = () => "stalker-last-offline";
const profileSnapshotsStoreKey = () => "stalker-profile-snapshots";
const userConfigsStoreKey = () => "stalker-user-configs";
const notificationOverridesKey = () => "stalker-notify-ids";

// In-memory state
export const lastOnlineTimestamps = new Map<string, number>();
export const lastOfflineTimestamps = new Map<string, number>();
export const offlineDurations = new Map<string, number>();
export const onlineDurations = new Map<string, number>();
export const recentCurrentUserMessages = new Map<string, number>();
export const lastKnownUsers = new Map<string, ProfileSnapshot>();
export const userConfigs = new Map<string, UserStalkerConfig>();
export const lastKnownStatuses = new Map<string, string | null>();
export const lastKnownActivities = new Map<string, any[]>();
export const typingCooldowns = new Map<string, number>();
export const pendingOnlineLogs = new Map<string, { timeout: ReturnType<typeof setTimeout>; entry: any; }>();
export const activityLogCooldowns = new Map<string, number>();
export const notificationOverrideIds = new Set<string>();

// defaults for new users
const DEFAULT_USER_CONFIG: Omit<UserStalkerConfig, "userId"> = {
    logPresenceChanges: true,
    logProfileChanges: true,
    logMessages: true,
    notifyPresenceChanges: false,
    notifyProfileChanges: true,
    notifyMessages: true,
    notifyTyping: true,
    typingConversationWindow: 10,
    serverFilterMode: "all",
    serverList: [],
    // Granular presence notifications (default all enabled)
    notifyOnline: true,
    notifyOffline: true,
    notifyIdle: true,
    notifyDnd: true,
    // Granular profile notifications (default all enabled)
    notifyUsername: true,
    notifyAvatar: true,
    notifyBanner: true,
    notifyBio: true,
    notifyPronouns: true,
    notifyGlobalName: true
};

// presence logs
export const presenceLogListeners = new Set<(logs: PresenceLogEntry[]) => void>();
export let presenceLogs: PresenceLogEntry[] = [];

export function setPresenceLogs(next: PresenceLogEntry[]) {
    presenceLogs = next;
    for (const listener of presenceLogListeners) listener(presenceLogs);
}

export function filterLogsByRetention(logs: PresenceLogEntry[], cutoffMs?: number) {
    const cutoff = cutoffMs ?? getRetentionCutoffMs();
    if (!cutoff) return logs;
    return logs.filter(entry => entry.timestamp >= cutoff);
}

export function addPresenceLog(entry: PresenceLogEntry & { activitySummary?: string; clientStatusSummary?: string; offlineDuration?: number; onlineDuration?: number; }) {
    const cutoffMs = getRetentionCutoffMs();
    const updatedLogs = [entry, ...filterLogsByRetention(presenceLogs, cutoffMs)];
    setPresenceLogs(updatedLogs);

    const line = `${formatTimestamp(entry.timestamp)} | ${entry.username} (${entry.userId}) | ${entry.previousStatus ?? "unknown"} -> ${entry.currentStatus}`;
    const parts = [line];
    if (entry.offlineDuration) parts.push(`Offline: ${getDurationLabel(entry.offlineDuration)}`);
    if (entry.onlineDuration) parts.push(`Online: ${getDurationLabel(entry.onlineDuration)}`);
    if (entry.activitySummary) parts.push(`Activity: ${entry.activitySummary}`);
    if (entry.clientStatusSummary) parts.push(`Clients: ${entry.clientStatusSummary}`);

    logger.info(parts.join(" | "));

    // Save to disk via native helper
    Native.appendLog(entry.userId, entry, cutoffMs).catch(e => logger.error("Failed to save log entry", e));

    // Check if we should send a notification for presence changes
    if (entry.type === "presence" && entry.previousStatus !== entry.currentStatus) {
        const userConfig = getUserConfig(entry.userId);
        if (userConfig.notifyPresenceChanges) {
            // Check granular settings for specific status types
            let shouldNotify = false;
            const currentStatus = entry.currentStatus?.toLowerCase();

            if (currentStatus === "online" && userConfig.notifyOnline !== false) shouldNotify = true;
            else if (currentStatus === "offline" && userConfig.notifyOffline !== false) shouldNotify = true;
            else if (currentStatus === "idle" && userConfig.notifyIdle !== false) shouldNotify = true;
            else if (currentStatus === "dnd" && userConfig.notifyDnd !== false) shouldNotify = true;
            else if (!["online", "offline", "idle", "dnd"].includes(currentStatus || "")) shouldNotify = true; // fallback for unknown statuses

            if (shouldNotify) {
                try {
                    const statusLabel = entry.currentStatus ? entry.currentStatus.charAt(0).toUpperCase() + entry.currentStatus.slice(1) : "Unknown";
                    let body = `Status changed to ${statusLabel}`;

                    if (entry.offlineDuration && entry.currentStatus !== "offline") {
                        body += ` (was offline for ${getDurationLabel(entry.offlineDuration)})`;
                    }

                    if (entry.activitySummary && entry.activitySummary !== "typing" && !entry.activitySummary.startsWith("profile:")) {
                        body += ` - ${entry.activitySummary}`;
                    }

                    showNotification({
                        title: `${entry.username} is ${statusLabel}`,
                        body,
                        icon: undefined
                    });
                } catch (e) { /* ignore notification errors */ }
            }
        }
    }
}


// user config
export async function loadUserConfigs() {
    try {
        const saved = await DataStore.get(userConfigsStoreKey()) as Record<string, UserStalkerConfig> | undefined;
        if (!saved) return;
        Object.entries(saved).forEach(([id, config]) => {
            if (config) {
                userConfigs.set(id, config);
            }
        });
        logger.info(`Loaded ${userConfigs.size} user configs from storage`);
    } catch (e) {
        logger.error("Failed to load user configs", e);
    }
}

export async function persistUserConfig(userId: string, config: UserStalkerConfig) {
    userConfigs.set(userId, config);
    DataStore.set(userConfigsStoreKey(), Object.fromEntries(userConfigs)).catch(e => {
        logger.error("Failed to persist user config", e);
    });
}

export function getUserConfig(userId: string): UserStalkerConfig {
    if (!userConfigs.has(userId)) {
        const newConfig: UserStalkerConfig = {
            userId,
            ...DEFAULT_USER_CONFIG
        };
        userConfigs.set(userId, newConfig);
        persistUserConfig(userId, newConfig);
        return newConfig;
    }
    const existing = userConfigs.get(userId)!;
    const merged: UserStalkerConfig = {
        ...DEFAULT_USER_CONFIG,
        ...existing,
        userId
    };
    if (JSON.stringify(existing) !== JSON.stringify(merged)) {
        userConfigs.set(userId, merged);
        persistUserConfig(userId, merged);
    }
    return merged;
}

// offline timestamps
export async function loadLastOfflineTimestamps() {
    try {
        const saved = await DataStore.get(lastOfflineStoreKey()) as Record<string, number> | undefined;
        if (!saved) return;
        Object.entries(saved).forEach(([id, ts]) => {
            if (ts > 0) {
                lastOfflineTimestamps.set(id, ts);
            }
        });
    } catch (e) {
        logger.error("Failed to load last offline timestamps", e);
    }
}

export function persistLastOfflineTimestamp(userId: string, timestamp: number) {
    lastOfflineTimestamps.set(userId, timestamp);
    DataStore.set(lastOfflineStoreKey(), Object.fromEntries(lastOfflineTimestamps)).catch(e => {
        logger.error("Failed to persist last offline timestamps", e);
    });
}

// profile snapshots
export async function loadProfileSnapshots() {
    try {
        const saved = await DataStore.get(profileSnapshotsStoreKey()) as Record<string, ProfileSnapshot> | undefined;
        if (!saved) return;
        Object.entries(saved).forEach(([id, snapshot]) => {
            if (snapshot) {
                lastKnownUsers.set(id, snapshot);
            }
        });
        logger.info(`Loaded ${lastKnownUsers.size} profile snapshots from storage`);
    } catch (e) {
        logger.error("Failed to load profile snapshots", e);
    }
}

export async function persistProfileSnapshot(userId: string, snapshot: ProfileSnapshot) {
    lastKnownUsers.set(userId, snapshot);
    DataStore.set(profileSnapshotsStoreKey(), Object.fromEntries(lastKnownUsers)).catch(e => {
        logger.error("Failed to persist profile snapshot", e);
    });
}

export async function clearProfileSnapshots() {
    lastKnownUsers.clear();
    try {
        await DataStore.del(profileSnapshotsStoreKey());
        logger.info("Cleared all profile snapshots");
    } catch (e) {
        logger.error("Failed to clear profile snapshots", e);
    }
}

export function captureProfileSnapshot(user: any, profileStore?: any, activities?: any[]): ProfileSnapshot {
    const profile = profileStore?.getUserProfile?.(user.id);
    const avatar = user.avatar ?? null;
    const banner = profile ? (profile.banner ?? user.banner ?? null) : undefined;
    const banner_color = profile ? (profile.bannerColor ?? (user as any).banner_color ?? (user as any).bannerColor ?? null) : undefined;
    const avatarDecorationData = (profile as any)?.avatarDecorationData ?? (user as any).avatarDecorationData ?? (user as any).avatar_decoration_data ?? null;

    // Extract custom status from activities (type 4 is CUSTOM_STATUS)
    const customStatusActivity = activities?.find(act => act.type === 4);
    const customStatus = customStatusActivity?.state ?? null;

    const connectedAccounts = profile?.connected_accounts ? (profile.connected_accounts || []).map((acc: any) => ({
        type: acc.type,
        name: acc.name,
        verified: acc.verified
    })) : undefined;

    return {
        username: user.username,
        avatar,
        discriminator: user.discriminator,
        global_name: (user as any).global_name ?? (user as any).globalName ?? null,
        bio: profile ? (profile.bio ?? null) : undefined,
        banner,
        banner_color: banner_color,
        avatarDecoration: avatarDecorationData?.asset ?? null,
        avatarDecorationData,
        customStatus,
        pronouns: profile ? (profile.pronouns ?? null) : undefined,
        theme_colors: profile?.theme_colors ?? undefined,
        emoji: profile?.emoji ?? undefined,
        connected_accounts: connectedAccounts
    };
}

// merge new snapshot with previous, preserving data that wasn't fetched
export function mergeProfileSnapshots(prev: ProfileSnapshot | undefined, current: ProfileSnapshot): ProfileSnapshot {
    if (!prev) return current;

    const merged: ProfileSnapshot = { ...prev };

    // basic fields
    const basicFields: (keyof ProfileSnapshot)[] = [
        "username", "avatar", "discriminator", "global_name",
        "avatarDecoration", "avatarDecorationData"
    ];

    for (const field of basicFields) {
        if (current[field] !== undefined) {
            merged[field] = current[field] as any;
        }
    }

    // profile fields (only update if provided)
    const profileFields: (keyof ProfileSnapshot)[] = [
        "bio", "banner", "banner_color", "pronouns",
        "theme_colors", "emoji", "connected_accounts"
    ];

    for (const field of profileFields) {
        if (current[field] !== undefined) {
            merged[field] = current[field] as any;
        }
    }

    // custom status (only when online)
    if (current.customStatus !== undefined) merged.customStatus = current.customStatus;

    return merged;
}

// detect real changes between snapshots
export function detectProfileChanges(prev: ProfileSnapshot, current: ProfileSnapshot): string[] {
    const changes: string[] = [];

    // simple comparison
    const simpleKeys: (keyof ProfileSnapshot)[] = [
        "username", "avatar", "discriminator", "global_name",
        "avatarDecoration", "bio", "banner", "banner_color",
        "pronouns", "customStatus"
    ];

    for (const key of simpleKeys) {
        // For profile fields, we only compare if BOTH values exist to avoid false positives
        // Basic fields (username etc) are always present so this check is safe for them too
        if (prev[key] !== undefined && current[key] !== undefined && prev[key] !== current[key]) {
            changes.push(key === "global_name" ? "display_name" : key);
        }
    }

    // deep comparison
    const complexKeys: (keyof ProfileSnapshot)[] = [
        "theme_colors", "emoji", "connected_accounts"
    ];

    for (const key of complexKeys) {
        if (prev[key] !== undefined && current[key] !== undefined) {
            if (JSON.stringify(prev[key]) !== JSON.stringify(current[key])) {
                changes.push(key === "emoji" ? "profile_emoji" : key);
            }
        }
    }

    return changes;
}

// load logs from disk
export async function loadPresenceLogs() {
    try {
        // Load logs for all users
        const userIds = getWhitelistedIds();
        const allLogs: PresenceLogEntry[] = [];
        const cutoffMs = getRetentionCutoffMs();

        for (const userId of userIds) {
            try {
                const userLogs = await Native.readLogs(userId, cutoffMs);
                allLogs.push(...userLogs);
            } catch (e) {
                logger.error(`Failed to load logs for user ${userId}`, e);
            }
        }

        // Sort by timestamp descending
        allLogs.sort((a, b) => b.timestamp - a.timestamp);

        presenceLogs = allLogs;
        setPresenceLogs(presenceLogs);
        logger.info(`Loaded ${allLogs.length} presence logs from disk`);

        const overrides = await DataStore.get(notificationOverridesKey()) as string[] | undefined;
        if (Array.isArray(overrides)) {
            notificationOverrideIds.clear();
            overrides.forEach(id => notificationOverrideIds.add(id));
        }
    } catch (e) {
        logger.error("Failed to load presence logs", e);
    }
}


export function getProfileChangeLabel(field: string): string {
    const labels: Record<string, string> = {
        username: "Username",
        avatar: "Avatar",
        discriminator: "Discriminator",
        global_name: "Display Name",
        display_name: "Display Name",
        bio: "Bio",
        banner: "Banner",
        banner_color: "Banner Color",
        avatar_decoration: "Avatar Decoration",
        connected_accounts: "Connected Accounts",
        mutual_friends_count: "Mutual Friends",
        mutual_guilds: "Mutual Servers",
        badges: "Badges",
        pronouns: "Pronouns",
        theme_colors: "Profile Colors",
        profile_emoji: "Profile Emoji",
        customStatus: "Custom Status"
    };
    return labels[field] ?? field;
}


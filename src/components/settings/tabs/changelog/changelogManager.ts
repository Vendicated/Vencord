/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import gitHash from "~git-hash";
import plugins from "~plugins";

export interface ChangelogEntry {
    hash: string;
    author: string;
    message: string;
    timestamp?: number;
}

export interface UpdateSession {
    id: string;
    timestamp: number;
    fromHash: string;
    toHash: string;
    commits: ChangelogEntry[];
    newPlugins: string[];
    updatedPlugins: string[];
    newSettings?: Map<string, string[]>;
    type: "update" | "repository_fetch";
}

export type ChangelogHistory = UpdateSession[];

const CHANGELOG_HISTORY_KEY = "EquicordChangelog_History";
const LAST_SEEN_HASH_KEY = "EquicordChangelog_LastSeenHash";
const KNOWN_PLUGINS_KEY = "EquicordChangelog_KnownPlugins";
const KNOWN_SETTINGS_KEY = "EquicordChangelog_KnownSettings";
const LAST_REPO_CHECK_KEY = "EquicordChangelog_LastRepoCheck";

type KnownPluginSettingsMap = Map<string, Set<string>>;

export async function getChangelogHistory(): Promise<ChangelogHistory> {
    const history = (await DataStore.get(
        CHANGELOG_HISTORY_KEY,
    )) as ChangelogHistory;
    return history || [];
}

export async function saveUpdateSession(
    commits: ChangelogEntry[],
    newPlugins: string[],
    updatedPlugins: string[],
    newSettings: Map<string, string[]>,
    forceLog: boolean = false,
): Promise<void> {
    const history = await getChangelogHistory();
    const lastSeenHash = await getLastSeenHash();
    const currentHash = gitHash;

    // For repository fetches, check if we already have this exact state logged (to prevent duplicate logs)
    if (forceLog) {
        const lastRepoCheck = await getLastRepositoryCheckHash();
        const latestRepoHash =
            commits.length > 0 ? commits[0].hash : currentHash;

        if (lastRepoCheck === latestRepoHash) {
            // if the state hasn't changed last check, do NOT make a new log
            return;
        }
    }

    // Don't save if no changes, unless explicitly forcing the log (for example repository fetch)
    if (
        !forceLog &&
        commits.length === 0 &&
        newPlugins.length === 0 &&
        updatedPlugins.length === 0 &&
        newSettings.size === 0
    ) {
        return;
    }

    // Determine session type and hash logic
    const sessionType = forceLog ? "repository_fetch" : "update";
    let fromHash = currentHash;
    let toHash = currentHash;

    if (forceLog) {
        // This is a repository fetch - show current vs repository state
        if (commits.length > 0) {
            // Repository has newer commits
            toHash = commits[0].hash; // Latest repository hash
        }
        // If no commits, fromHash === toHash (up to date)
    } else {
        // This is an actual update session
        // Is there a better way to do this?
        fromHash = lastSeenHash || "unknown";
        toHash = currentHash;
    }

    const session: UpdateSession = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        fromHash: fromHash,
        toHash: toHash,
        commits,
        newPlugins,
        updatedPlugins,
        newSettings,
        type: sessionType,
    };

    // Add to beginning of history (most recent first)
    history.unshift(session);

    // Keep only last 50 sessions to prevent storage bloat
    if (history.length > 50) {
        history.splice(50);
    }

    await DataStore.set(CHANGELOG_HISTORY_KEY, history);

    if (!forceLog) {
        await setLastSeenHash(currentHash);
    } else {
        // for fetches, check the latest repo hash to make sure its not the same
        const latestRepoHash =
            commits.length > 0 ? commits[0].hash : currentHash;
        await setLastRepositoryCheckHash(latestRepoHash);
    }

    await updateKnownPlugins();
    await updateKnownSettings();
}

export async function getLastSeenHash(): Promise<string | null> {
    return (await DataStore.get(LAST_SEEN_HASH_KEY)) as string | null;
}

export async function setLastSeenHash(hash: string): Promise<void> {
    await DataStore.set(LAST_SEEN_HASH_KEY, hash);
}

export async function getKnownPlugins(): Promise<Set<string>> {
    const known = (await DataStore.get(KNOWN_PLUGINS_KEY)) as string[];
    return new Set(known || []);
}

export async function updateKnownPlugins(): Promise<void> {
    const currentPlugins = Object.keys(plugins);
    await DataStore.set(KNOWN_PLUGINS_KEY, currentPlugins);
}

function getSettingsSetForPlugin(plugin: string): Set<string> {
    const settings = plugins[plugin]?.settings?.def || {};
    return new Set(
        Object.keys(settings).filter(setting => setting !== "enabled"),
    );
}

function getCurrentSettings(pluginList: string[]): KnownPluginSettingsMap {
    return new Map(
        pluginList.map(name => [name, getSettingsSetForPlugin(name)]),
    );
}

export async function getKnownSettings(): Promise<KnownPluginSettingsMap> {
    let map = (await DataStore.get(
        KNOWN_SETTINGS_KEY,
    )) as KnownPluginSettingsMap;
    if (map === undefined) {
        const knownPlugins = await getKnownPlugins();
        const Plugins = [...Object.keys(plugins), ...Array.from(knownPlugins)];
        map = getCurrentSettings(Plugins);
        await DataStore.set(KNOWN_SETTINGS_KEY, map);
    }
    return map;
}

export async function getNewSettings(): Promise<Map<string, string[]>> {
    const map = getCurrentSettings(Object.keys(plugins));
    const knownSettings = await getKnownSettings();
    const newSettings = new Map<string, string[]>();

    map.forEach((settings, plugin) => {
        const filteredSettings = [...settings].filter(
            setting => !knownSettings.get(plugin)?.has(setting),
        );
        if (filteredSettings.length > 0) {
            newSettings.set(plugin, filteredSettings);
        }
    });

    return newSettings;
}

export async function updateKnownSettings(): Promise<void> {
    const currentSettings = getCurrentSettings(Object.keys(plugins));
    const knownSettings = await getKnownSettings();
    const allSettings = new Map();

    new Set([...currentSettings.keys(), ...knownSettings.keys()]).forEach(
        plugin => {
            allSettings.set(
                plugin,
                new Set([
                    ...(currentSettings.get(plugin) || []),
                    ...(knownSettings.get(plugin) || []),
                ]),
            );
        },
    );

    await DataStore.set(KNOWN_SETTINGS_KEY, allSettings);
}

export async function getNewPlugins(): Promise<string[]> {
    const currentPlugins = Object.keys(plugins);
    const knownPlugins = await getKnownPlugins();

    return currentPlugins.filter(
        plugin =>
            !knownPlugins.has(plugin) &&
            !plugins[plugin].hidden &&
            !plugins[plugin].required,
    );
}

export async function getUpdatedPlugins(): Promise<string[]> {
    // This is a placeholder - in a real implementation, you'd track plugin version changes
    // For now, we'll return empty array since plugin version tracking would need to be implemented
    return [];
}

export async function clearChangelogHistory(): Promise<void> {
    await DataStore.del(CHANGELOG_HISTORY_KEY);
    await DataStore.del(LAST_SEEN_HASH_KEY);
    await DataStore.del(KNOWN_SETTINGS_KEY);
}

export async function clearIndividualLog(logId: string): Promise<void> {
    const history = await getChangelogHistory();
    const filteredHistory = history.filter(log => log.id !== logId);
    await DataStore.set(CHANGELOG_HISTORY_KEY, filteredHistory);
}

export async function initializeChangelog(): Promise<void> {
    // Initialize with current state if first time
    const lastSeenHash = await getLastSeenHash();
    if (!lastSeenHash) {
        await setLastSeenHash(gitHash);
        await updateKnownPlugins();
        await updateKnownSettings();
    }
}

export async function getLastRepositoryCheckHash(): Promise<string | null> {
    return (await DataStore.get(LAST_REPO_CHECK_KEY)) as string | null;
}

export async function setLastRepositoryCheckHash(hash: string): Promise<void> {
    await DataStore.set(LAST_REPO_CHECK_KEY, hash);
}

export function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

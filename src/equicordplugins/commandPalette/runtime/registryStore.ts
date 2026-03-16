/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CommandEntry } from "../registry";

export interface RegistryStore {
    getRegistryVersion(): number;
    bumpRegistryVersion(): void;
    subscribeRegistry(listener: (version: number) => void): () => void;
    getCommandSearchText(commandId: string): string;
    setCommandSearchText(commandId: string, text: string): void;
    deleteCommandSearchText(commandId: string): void;
    clearSearchTextCache(): void;
    getCachedSortedCommands(): CommandEntry[] | null;
    setCachedSortedCommands(commands: CommandEntry[] | null): void;
    getCategoryCommandCache(): Map<string, CommandEntry[]>;
    getTreeCommandCache(): Map<string, CommandEntry[]>;
}

export function createRegistryStore(): RegistryStore {
    let registryVersion = 0;
    let cachedSortedCommands: CommandEntry[] | null = null;
    const categoryCommandCache = new Map<string, CommandEntry[]>();
    const treeCommandCache = new Map<string, CommandEntry[]>();
    const searchTextCache = new Map<string, string>();
    const registryListeners = new Set<(version: number) => void>();

    const invalidateCaches = () => {
        cachedSortedCommands = null;
        categoryCommandCache.clear();
        treeCommandCache.clear();
    };

    const emitRegistryVersion = () => {
        for (const listener of registryListeners) listener(registryVersion);
    };

    return {
        getRegistryVersion: () => registryVersion,
        bumpRegistryVersion: () => {
            registryVersion += 1;
            invalidateCaches();
            emitRegistryVersion();
        },
        subscribeRegistry: listener => {
            let active = true;
            const wrapped = (version: number) => {
                if (!active) return;
                listener(version);
            };

            registryListeners.add(wrapped);
            wrapped(registryVersion);

            return () => {
                active = false;
                registryListeners.delete(wrapped);
            };
        },
        getCommandSearchText: commandId => searchTextCache.get(commandId) ?? "",
        setCommandSearchText: (commandId, text) => {
            searchTextCache.set(commandId, text);
        },
        deleteCommandSearchText: commandId => {
            searchTextCache.delete(commandId);
        },
        clearSearchTextCache: () => {
            searchTextCache.clear();
        },
        getCachedSortedCommands: () => cachedSortedCommands,
        setCachedSortedCommands: commands => {
            cachedSortedCommands = commands;
        },
        getCategoryCommandCache: () => categoryCommandCache,
        getTreeCommandCache: () => treeCommandCache
    };
}

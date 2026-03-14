/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

const RECENT_COMMAND_LIMIT = 10;
const RECENT_STORAGE_KEY = "CommandPaletteRecentCommands";
const RECENT_COMMAND_SKIP_IDS = new Set<string>([
    "command-palette-rerun-last",
    "command-palette-toggle-pin-last",
    "command-palette-show-recent",
    "command-palette-open-settings"
]);

export interface RecentsStore {
    ready: Promise<void>;
    record(commandId: string): Promise<void>;
    mark(commandId: string): Promise<void>;
    list(): string[];
    newest(excludeId?: string): string | undefined;
    isSkippable(commandId: string): boolean;
}

export function createRecentsStore(bumpRegistryVersion: () => void): RecentsStore {
    const recentCommandIds: string[] = [];

    const ready = (async () => {
        try {
            const stored = await DataStore.get<string[]>(RECENT_STORAGE_KEY);
            if (!Array.isArray(stored)) return;

            for (const id of stored) {
                if (typeof id !== "string" || !id) continue;
                if (RECENT_COMMAND_SKIP_IDS.has(id)) continue;
                if (recentCommandIds.includes(id)) continue;
                recentCommandIds.push(id);
                if (recentCommandIds.length >= RECENT_COMMAND_LIMIT) break;
            }
        } catch {
            return;
        } finally {
            bumpRegistryVersion();
        }
    })();

    const persist = async () => {
        try {
            await ready;
            await DataStore.set(RECENT_STORAGE_KEY, [...recentCommandIds]);
        } catch {
            return;
        }
    };

    const recordInternal = (commandId: string) => {
        const index = recentCommandIds.indexOf(commandId);
        if (index !== -1) recentCommandIds.splice(index, 1);
        recentCommandIds.unshift(commandId);
        if (recentCommandIds.length > RECENT_COMMAND_LIMIT) {
            recentCommandIds.length = RECENT_COMMAND_LIMIT;
        }
    };

    return {
        ready,
        record: async commandId => {
            recordInternal(commandId);
            await persist();
        },
        mark: async commandId => {
            recordInternal(commandId);
            await persist();
        },
        list: () => [...recentCommandIds],
        newest: excludeId => {
            for (const id of recentCommandIds) {
                if (id === excludeId || RECENT_COMMAND_SKIP_IDS.has(id)) continue;
                return id;
            }
            return undefined;
        },
        isSkippable: commandId => RECENT_COMMAND_SKIP_IDS.has(commandId)
    };
}

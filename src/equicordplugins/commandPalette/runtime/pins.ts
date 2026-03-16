/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

const PINNED_STORAGE_KEY = "CommandPalettePinned";

export interface PinsStore {
    ready: Promise<void>;
    has(commandId: string): boolean;
    add(commandId: string): void;
    delete(commandId: string): void;
    values(): Set<string>;
    emit(): void;
    persist(): Promise<void>;
    subscribe(listener: (pins: Set<string>) => void): () => void;
}

export function createPinsStore(): PinsStore {
    const pinnedCommandIds = new Set<string>();
    const pinListeners = new Set<(pins: Set<string>) => void>();

    const ready = (async () => {
        try {
            const stored = await DataStore.get<string[]>(PINNED_STORAGE_KEY);
            if (Array.isArray(stored)) {
                for (const id of stored) pinnedCommandIds.add(id);
            }
        } catch {
            return;
        }
    })();

    const emit = () => {
        const snapshot = new Set(pinnedCommandIds);
        for (const listener of pinListeners) listener(snapshot);
    };

    const persist = async () => {
        try {
            await DataStore.set(PINNED_STORAGE_KEY, Array.from(pinnedCommandIds));
        } catch {
            return;
        }
    };

    return {
        ready,
        has: commandId => pinnedCommandIds.has(commandId),
        add: commandId => {
            pinnedCommandIds.add(commandId);
        },
        delete: commandId => {
            pinnedCommandIds.delete(commandId);
        },
        values: () => new Set(pinnedCommandIds),
        emit,
        persist,
        subscribe: listener => {
            let active = true;
            const wrapped = (pins: Set<string>) => {
                if (!active) return;
                listener(new Set(pins));
            };

            pinListeners.add(wrapped);
            void ready.then(() => wrapped(pinnedCommandIds));

            return () => {
                active = false;
                pinListeners.delete(wrapped);
            };
        }
    };
}

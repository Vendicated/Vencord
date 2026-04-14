/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type ZustandDefinition<T> = (set: (state: Partial<T>) => void, get: () => T) => T;

export interface ZustandStore<T> {
    (): T;
    getState(): T;
}

export interface PersistedZustandStore<T> extends ZustandStore<T> {
    persist: {
        rehydrate(): Promise<void>;
    };
}

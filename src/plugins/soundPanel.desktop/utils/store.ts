/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxStore } from "@vencord/discord-types";
import { React, useEffect, useReducer } from "@webpack/common";

interface Store<T extends object> {
    get(): T;
    set(patch: Partial<T>): void;
    subscribe(listener: () => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
    let state = initial;
    const listeners = new Set<() => void>();

    return {
        get: () => state,
        set(patch) {
            state = { ...state, ...patch };
            listeners.forEach(listener => listener());
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
}

export function useStore<T extends object, S>(store: Store<T>, select: (state: T) => S) {
    return React.useSyncExternalStore(store.subscribe, () => select(store.get()));
}

export function useFluxUpdates(stores: FluxStore[]) {
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    useEffect(() => {
        stores.forEach(store => store.addChangeListener(rerender));
        return () => stores.forEach(store => store.removeChangeListener(rerender));
    }, []);
}

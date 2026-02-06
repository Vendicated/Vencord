/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const states = new Map<string, boolean>();
const draggingStates = new Map<string, boolean>();
const listeners = new Set<() => void>();

export interface PopoutStoreType {
    isClearView(key: string): boolean;
    setClearView(key: string, enabled: boolean): void;
    isDragging(key: string): boolean;
    setDragging(key: string, enabled: boolean): void;
    addChangeListener(l: () => void): void;
    removeChangeListener(l: () => void): void;
    addReactChangeListener(l: () => void): void;
    removeReactChangeListener(l: () => void): void;
    subscribe(l: () => void): () => boolean;
}

export const PopoutStore: PopoutStoreType = {
    isClearView(key: string) {
        return states.get(key) ?? false;
    },

    setClearView(key: string, enabled: boolean) {
        if (states.get(key) === enabled) return;
        states.set(key, enabled);

        listeners.forEach(l => l());
    },

    isDragging(key: string) {
        return draggingStates.get(key) ?? false;
    },

    setDragging(key: string, enabled: boolean) {
        if (draggingStates.get(key) === enabled) return;
        draggingStates.set(key, enabled);

        listeners.forEach(l => l());
    },

    // Vencord hooks like useStateFromStores use these
    addChangeListener(l: () => void) {
        listeners.add(l);
    },

    removeChangeListener(l: () => void) {
        listeners.delete(l);
    },

    // Discord's internal connectStores expects this
    addReactChangeListener(l: () => void) {
        listeners.add(l);
    },

    removeReactChangeListener(l: () => void) {
        listeners.delete(l);
    },

    // Custom subscribe helper
    subscribe(l: () => void) {
        listeners.add(l);
        return () => listeners.delete(l);
    }
};

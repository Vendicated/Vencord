/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxDispatcher } from "@webpack/common";

const states = new Map<string, boolean>();
const draggingStates = new Map<string, boolean>();
const listeners = new Set<() => void>();

export const PopoutStore = {
    isClearView(key: string) {
        return states.get(key) ?? false;
    },

    setClearView(key: string, enabled: boolean) {
        if (states.get(key) === enabled) return;
        states.set(key, enabled);

        listeners.forEach(l => l());

        // Dispatch an event
        FluxDispatcher.dispatch({
            type: "VC_POPOUT_PLUS_CLEAR_VIEW_UPDATE",
            key,
            enabled
        });
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

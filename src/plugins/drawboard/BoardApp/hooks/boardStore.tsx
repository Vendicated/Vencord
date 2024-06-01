/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

function createBoardStore<T>(init?: T) {
    if (!init) return;
    let store: T = init;
    const listeners = new Set<any>();

    function use() {
        const [, listener] = React.useState();
        React.useEffect(() => {
            listeners.add(listener);
            return () => listeners.delete(listener) as unknown as void;
        }, []);
        return store;
    }

    function set<T1 extends typeof init>(newStore: T1 extends T ? (x: T1) => T1 : T) {
        store = typeof newStore === "function" ? newStore(store) : newStore;
        listeners.forEach(l => l(store));
    }

    function get(): T { return store; }


    return { get, set, use };
}

export const drawboardStore = createBoardStore<{ images: Array<{ url: string; }>; }>({ images: [] });

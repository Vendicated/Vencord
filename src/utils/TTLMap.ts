/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * A Map whose entries expire after a given amount of time. When an entry expires, it is automatically removed from the map and an optional callback is called.
 */
export class TTLMap<K, V> extends Map<K, V> {
    private readonly _timers = new Map<K, NodeJS.Timeout>();

    public constructor(public readonly expiryMs: number, private readonly onExpire?: (key: K, value: V) => void) {
        super();
    }

    public set(key: K, value: V) {
        const timeoutId = setTimeout(() => {
            this.delete(key);
            this.onExpire?.(key, value);
        }, this.expiryMs);
        this._timers.set(key, timeoutId);

        return super.set(key, value);
    }

    public delete(key: K) {
        if (this._timers.has(key)) {
            clearTimeout(this._timers.get(key));
            this._timers.delete(key);
        }

        return super.delete(key);
    }

    clear(): void {
        for (const timeoutId of this._timers.values())
            clearTimeout(timeoutId);

        this._timers.clear();
        return super.clear();
    }
}

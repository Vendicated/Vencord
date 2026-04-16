/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 nin0
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export class VariableWithCallbacks<T> {
    #value: T;
    #callbacks: {
        id: number;
        callback: (value: T, id: number) => void;
    }[] = [];

    constructor(value: T) {
        this.#value = value;
    }

    value(newValue?: T): T {
        if (newValue !== undefined) {
            this.#value = newValue;
            this.#callbacks.forEach(c => c.callback(this.#value, c.id));
        }
        return this.#value;
    }

    registerCallback(callback: (value: T, id: number) => void): number {
        const id = Date.now();
        this.#callbacks.push({
            id,
            callback
        });
        return id;
    }

    deregisterCallback(id: number) {
        const possibleFallback = this.#callbacks.find(cb => cb.id === id);
        if (!possibleFallback) return;
        this.#callbacks.splice(this.#callbacks.indexOf(possibleFallback), 1);
    }
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export class EventEmitter<T> {
    events: {
        [key: string]: ((val: T) => void)[];
    };

    constructor() {
        this.events = {};
    }

    on(eventName: string, callback: (val: T) => void) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }

        this.events[eventName].push(callback);
    }

    emit(eventName: string, val: T) {
        if (!this.events[eventName]) {
            return;
        }

        this.events[eventName].forEach(callback => {
            callback(val);
        });
    }

    off(eventName: string, callback: (val: T) => void) {
        if (!this.events[eventName]) {
            return;
        }

        this.events[eventName] = this.events[eventName].filter(cb => {
            return cb !== callback;
        });
    }

    clear() {
        this.events = {};
    }

    once(eventName: string, callback: (val: T) => void) {
        const onceCallback = (val: T) => {
            callback(val);
            this.off(eventName, onceCallback);
        };

        this.on(eventName, onceCallback);
    }
}

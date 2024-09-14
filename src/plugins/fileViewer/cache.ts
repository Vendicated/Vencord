/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

export class LRUCache {
    private cache: Map<string, string>;
    private maxSize: number;

    constructor() {
        this.cache = new Map();
        this.maxSize = 50;
    }

    get(key: string): string | undefined {
        if (!this.cache.has(key)) return undefined;

        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key: string, value: string) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value!;
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, value);
    }

    delete(key: string) {
        if (!this.cache.has(key)) return;
        URL.revokeObjectURL(this.cache.get(key)!);
        this.cache.delete(key);
    }

    clear() {
        for (const key of this.cache.keys()) {
            URL.revokeObjectURL(this.cache.get(key)!);
        }
        this.cache.clear();
    }

    setMaxSize(maxSize: number) {
        if (maxSize < 1) {
            new Logger("FileViewer").error("Cache size must be at least 1");
            return;
        }
        this.maxSize = maxSize;
    }

    getMaxSize() {
        return this.maxSize;
    }
}

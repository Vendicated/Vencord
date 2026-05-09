/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const MAX_FILES_CACHED_AT_MAX_SIZE = 5;
const BASE64_OVERHEAD = 1.37;
const CACHE_SIZE_MULTIPLIER = BASE64_OVERHEAD * MAX_FILES_CACHED_AT_MAX_SIZE;

const MIN_CACHE_SIZE_MB_CAP = 5;
const MAX_CACHE_SIZE_MB_CAP = 500;

/*
 * LRU-style cache with dynamic size limit based on max file size setting
 */
export class LRU {
    cache: Map<string, string>; // might make this generic but ehh
    private _size: number = 0;
    private _maxSize: number = 0;

    constructor() {
        this.cache = new Map();
        this.setSizeLimit(100);
    }

    setSizeLimit(maxFileSizeMB: number): void {
        const calculatedSize = Math.round(maxFileSizeMB * CACHE_SIZE_MULTIPLIER);
        this._maxSize = Math.min(Math.max(calculatedSize, MIN_CACHE_SIZE_MB_CAP), MAX_CACHE_SIZE_MB_CAP) * 1024 * 1024;
    }

    set(fileId: string, dataUri: string): void {
        const uriSize = dataUri.length;

        if (uriSize > this._maxSize) {
            throw new Error(`File too large to cache (${Math.round(uriSize / (1024 * 1024))}MB > ${Math.round(this.maxSize() / (1024 * 1024))}MB limit)`);
        }

        while (this._size + uriSize > this._maxSize && this.cache.size > 0) {
            const oldestKey = this.first();

            if (oldestKey) {
                const oldestSize = this.cache.get(oldestKey)?.length || 0;
                this.cache.delete(oldestKey);
                this._size -= oldestSize;
            }
        }

        this.cache.set(fileId, dataUri);
        this._size += uriSize;
    }

    get(fileId: string): string | undefined {
        const dataUri = this.cache.get(fileId);
        if (dataUri !== undefined) {
            this.cache.delete(fileId);
            this.cache.set(fileId, dataUri);
        }
        return dataUri;
    }

    clear(): void {
        this.cache.clear();
        this._size = 0;
    }

    first(): string | undefined {
        return this.cache.keys().next().value;
    }

    size(): number {
        return this._size;
    }

    maxSize(): number {
        return this._maxSize;
    }
}

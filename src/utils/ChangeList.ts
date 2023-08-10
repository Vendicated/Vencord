/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export class ChangeList<T>{
    private set = new Set<T>();

    public get changeCount() {
        return this.set.size;
    }

    public get hasChanges() {
        return this.changeCount > 0;
    }

    public handleChange(item: T) {
        if (!this.set.delete(item))
            this.set.add(item);
    }

    public add(item: T) {
        return this.set.add(item);
    }

    public remove(item: T) {
        return this.set.delete(item);
    }

    public getChanges() {
        return this.set.values();
    }

    public map<R>(mapper: (v: T, idx: number, arr: T[]) => R): R[] {
        return [...this.getChanges()].map(mapper);
    }
}

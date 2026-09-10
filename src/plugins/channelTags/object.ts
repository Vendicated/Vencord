/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

type EntriesOf<T> = { [K in keyof T]-?: [K, T[K]]; }[keyof T][];
export const entriesOf = Object.entries as <T>(obj: T) => EntriesOf<T>;

type PresentEntries<T> = { [K in keyof T]-?: [K, Exclude<T[K], undefined>]; }[keyof T][];
export const presentEntries = (<T>(obj: T) => Object.entries(obj as object).filter(([, value]) => value !== undefined)) as <T>(obj: T) => PresentEntries<T>;

type KeysOf<T> = (keyof T)[];
export const keysOf = Object.keys as <T extends object>(obj: T) => KeysOf<T>;

type ValuesOf<T> = T[keyof T][];
export const valuesOf = Object.values as <T extends object>(obj: T) => ValuesOf<T>;
export const presentValues = (<T extends object>(obj: T) => Object.values(obj).filter(value => value !== undefined)) as <T extends object>(obj: T) => Exclude<T[keyof T], undefined>[];

/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";

export declare class Frecency<Key extends PropertyKey = PropertyKey, Value = unknown> {
    constructor(options: {
        afterCompute: Frecency<Key, Value>["afterCompute"];
        computeBonus: Frecency<Key, Value>["computeBonus"];
        computeFrecency?: Frecency["computeFrecency"] | undefined /* = frecencyAlgorithms.original */;
        computeWeight: Frecency<Key, Value>["computeWeight"];
        lookupKey: Frecency<Key, Value>["lookupKey"];
        maxSamples?: number | undefined /* = 10 */;
        numFrequentlyItems?: number | undefined /* = 32 */;
    });

    compute(): void;
    get frequently(): Value[];
    set frequently(values: Value[]);
    getEntry(key?: Key | null): FrecencyUsageHistoryEntry | Nullish;
    getFrecency(key?: Key | null): number | null;
    getScore(key?: Key | null): number | null;
    isDirty(): boolean;
    markDirty(): void;
    overwriteHistory(
        usageHistory?: Omit<FrecencyUsageHistoryEntry, "frecency"> | null,
        track?: readonly {
            key?: Key | Nullish;
            timestamp?: number | Nullish;
        }[] | null
    ): void;
    replaceEntryComputeFunctions(
        computeWeight: Frecency["computeWeight"],
        computeFrecency: Frecency["computeFrecency"],
        calculateMaxTotalUse: Frecency["calculateMaxTotalUse"]
    ): void;
    track(key?: Key | null, timestamp?: number | null): void;

    _frequently: Value[];
    afterCompute: (
        usageHistory: Frecency<Key, Value>["usageHistory"],
        frequently: Frecency<Key, Value>["frequently"]
    ) => void;
    calculateMaxTotalUse: boolean;
    computeBonus: (key: Key) => number;
    computeFrecency: (
        totalUses: number,
        score: number,
        usageStats: {
            maxTotalUse: number | undefined;
            numOfRecentUses: number;
        }
    ) => number;
    computeWeight: (daysSinceUsage: number) => number;
    dirty: boolean;
    lookupKey: (key: Key) => Value;
    maxSamples: number;
    numFrequentlyItems: number;
    usageHistory: Partial<Record<Key, FrecencyUsageHistoryEntry>>;
}

export interface FrecencyUsageHistoryEntry {
    frecency: number;
    recentUses: number[];
    score: number;
    totalUses: number;
}

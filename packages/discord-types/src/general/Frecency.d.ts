/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";

export class Frecency<Key extends PropertyKey = PropertyKey, Value = unknown> {
    constructor(options: {
        afterCompute: Frecency<Key, Value>["afterCompute"];
        computeBonus: Frecency<Key, Value>["computeBonus"];
        computeWeight: Frecency<Key, Value>["computeWeight"];
        lookupKey: Frecency<Key, Value>["lookupKey"];
        maxSamples?: number | undefined /* = 10 */;
        numFrequentlyItems?: number | undefined /* = 32 */;
    });

    compute(): void;
    get frequently(): Value[];
    set frequently(values: Value[]);
    getEntry(key?: Key | Nullish): FrecencyUsageHistory | Nullish;
    getFrecency(key?: Key | Nullish): number | null;
    getScore(key?: Key | Nullish): number | null;
    isDirty(): boolean;
    markDirty(): void;
    overwriteHistory(
        usageHistory?: Omit<FrecencyUsageHistory, "frecency"> | Nullish,
        track?: {
            key?: Key | Nullish;
            timestamp?: number | Nullish;
        }[] | Nullish
    ): void;
    track(key?: Key | Nullish, timestamp?: number | Nullish): void;

    _frequently: Value[];
    afterCompute: (
        usageHistory: Frecency<Key, Value>["usageHistory"],
        frequently: Frecency<Key, Value>["frequently"]
    ) => void;
    computeBonus: (key: Key) => number;
    computeWeight: (daysSinceUsage: number) => number;
    dirty: boolean;
    lookupKey: (key: Key) => Value;
    maxSamples: number;
    numFrequentlyItems: number;
    usageHistory: Record<Key, FrecencyUsageHistory>;
}

export interface FrecencyUsageHistory {
    frecency: number;
    recentUses: number[];
    score: number;
    totalUses: number;
}

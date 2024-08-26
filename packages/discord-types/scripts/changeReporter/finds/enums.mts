/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// eslint-disable-next-line import/no-relative-packages
import type * as Vencord from "../../../../../src/Vencord.ts";
import type { CR } from "../types.mts";

export function autoFindEnum(this: typeof Vencord, source: CR.EnumSource) {
    let bestMatch: CR.EnumChanges | undefined;
    let lowestChangedCount = Infinity;

    const checked = new WeakSet();
    this.Webpack.find(exps => {
        for (const name in exps) {
            let exp: unknown;
            // Some getters throw errors
            try {
                exp = exps[name];
            } catch {
                continue;
            }

            if (isValidEnum(exp) && !checked.has(exp)) {
                checked.add(exp);

                const changes = getEnumChanges(source, exp);
                const { changedCount } = changes;
                if (
                    changedCount < lowestChangedCount
                    // If changedCount is the same as lowestChangedCount, keep the match with the least removals.
                    || changedCount === lowestChangedCount
                    && bestMatch
                    && Object.keys(changes.removals).length < Object.keys(bestMatch.removals).length
                ) {
                    lowestChangedCount = changedCount;
                    bestMatch = changes;
                }
            }
        }

        return false;
    }, { isIndirect: true });

    return bestMatch;
}

export function isValidEnum(value: unknown): value is CR.EnumMembers {
    return typeof value === "object"
        && value !== null
        && !Array.isArray(value);
}

export function getEnumChanges(source: CR.EnumSource, obj: CR.EnumMembers): CR.EnumChanges {
    const additions: CR.EnumMembers = {};
    const removals: CR.EnumMembers = { ...source };
    let unchangedCount = 0;
    let changedCount = 0;

    for (const key in obj) {
        // Ignore numeric enum reverse mapping
        if (parseFloat(key) === Number(key)) continue;

        // Some getters throw errors
        try {
            const value = obj[key]!;
            if (key in source && value === source[key]) {
                delete removals[key];
                unchangedCount++;
            } else {
                additions[key] = value;
                changedCount++;
            }
        } catch {
            changedCount = Infinity;
            break;
        }
    }

    changedCount += Object.keys(removals).length;

    return {
        additions,
        removals,
        unchangedCount,
        changedCount
    };
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { evaluateCalculatorIntent } from "./evaluator";
import { parseCalculatorQuery } from "./parser";
import type { CalculatorResult } from "./types";

export type {
    CalculatorGraphSeries,
    CalculatorResult,
    CalculatorResultKind,
    CalculatorViewMode
} from "./types";

export function resolveCalculatorQuery(query: string): CalculatorResult | null {
    const intent = parseCalculatorQuery(query);
    if (!intent) return null;
    return evaluateCalculatorIntent(intent);
}

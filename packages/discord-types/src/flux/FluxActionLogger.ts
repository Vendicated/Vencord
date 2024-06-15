/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { EventEmitter } from "events";

import type { Nullish } from "../internal";
import type { FluxActionLog } from "./FluxActionLog";
import type { FluxAction, FluxActionType } from "./fluxActions";

// Original name: ActionLogger
export declare class FluxActionLogger extends EventEmitter {
    constructor(options?: { persist?: boolean | undefined; } | undefined);

    getLastActionMetrics(
        title: string,
        limit?: number | undefined /* = 20 */
    ): FluxActionMetric[];
    getSlowestActions<ActionType extends FluxActionType = FluxActionType>(
        actionType?: ActionType | Nullish,
        limit?: number | undefined /* = 20 */
    ): FluxActionMetric<ActionType>[];
    log<Action extends FluxAction>(
        action: Action,
        callback: (func: <T>(storeName: string, func: () => T) => T) => void
    ): FluxActionLog<Action>;

    logs: FluxActionLog[];
    persist: boolean;
}

export type FluxActionMetric<ActionType extends FluxActionType = FluxActionType>
    = [storeName: string, actionType: ActionType, totalTime: number];

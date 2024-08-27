/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { EventEmitter } from "events";

import type { Nullish } from "../internal";
import type { ActionLog } from "./ActionLog";
import type { Action, ActionType } from "./actions";

export declare class ActionLogger extends EventEmitter {
    constructor(options?: { persist?: boolean | undefined; } | undefined);

    getLastActionMetrics(
        title: string,
        limit?: number | undefined /* = 20 */
    ): ActionMetric[];
    getSlowestActions<T extends ActionType = ActionType>(
        actionType?: T | Nullish,
        limit?: number | undefined /* = 20 */
    ): ActionMetric<T>[];
    log<A extends Action>(
        action: A,
        callback: (func: <T>(storeName: string, func: () => T) => T) => void
    ): ActionLog<A>;

    logs: ActionLog[];
    persist: boolean;
}

export type ActionMetric<T extends ActionType = ActionType>
    = [storeName: string, actionType: T, totalTime: number];

/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxAction } from "./fluxActions";

// Original name: ActionLog
export declare class FluxActionLog<Action extends FluxAction = FluxAction> {
    constructor(actionType: Action["type"]);

    get name(): Action["type"];
    toJSON(): Pick<this, "action" | "createdAt" | "traces"> & {
        created_at: FluxActionLog["createdAt"];
    };

    action: Action;
    createdAt: Date;
    error: Error | undefined;
    id: number;
    startTime: number;
    totalTime: number;
    traces: FluxActionLogTrace[];
}

export interface FluxActionLogTrace {
    /** Store name */
    name: string;
    time: number;
}

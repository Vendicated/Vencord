/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Action } from "./actions";

export declare class ActionLog<A extends Action = Action> {
    constructor(actionType: A["type"]);

    get name(): A["type"];
    toJSON(): Pick<ActionLog<A>, "action" | "createdAt" | "traces"> & {
        created_at: ActionLog["createdAt"];
    };

    action: A;
    createdAt: Date;
    error: Error | undefined;
    id: number;
    startTime: number;
    totalTime: number;
    traces: ActionLogTrace[];
}

export interface ActionLogTrace {
    /** Store name */
    name: string;
    time: number;
}

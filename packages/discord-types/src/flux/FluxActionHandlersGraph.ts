/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { DepGraph } from "dependency-graph";
import type { UnionToIntersection } from "type-fest";

import type { Nullish } from "../internal";
import type { ExtractAction, FluxAction, FluxActionHandler, FluxActionType } from "./fluxActions";
import type { FluxDispatchBand } from "./FluxDispatcher";

// Original name: ActionHandlersGraph
export declare class FluxActionHandlersGraph {
    _addToBand(dispatchToken: string, dispatchBand: FluxDispatchBand): void;
    _bandToken(dispatchBand: FluxDispatchBand): string;
    _computeOrderedActionHandlers<ActionType extends FluxActionType>(
        actionType: ActionType
    ): FluxOrderedActionHandlers<ExtractAction<FluxAction, ActionType>>[];
    _computeOrderedCallbackTokens(): string[];
    _invalidateCaches(): void;
    _validateDependencies(fromDispatchToken: string, toDispatchToken: string): void;
    addDependencies(fromDispatchToken: string, toDispatchTokens: string[]): void;
    createToken(): string;
    getOrderedActionHandlers<ActionType extends FluxActionType>(partialAction: {
        type: ActionType;
    }): FluxOrderedActionHandlers<ExtractAction<FluxAction, ActionType>>;
    register<Action extends FluxAction>(
        storeName: string,
        actionHandlers: FluxActionHandlerMap<Action>,
        storeDidChange: FluxActionHandler<Action>,
        dispatchBand: FluxDispatchBand,
        dispatchToken?: string | undefined /* = this.createToken() */
    ): string;

    _dependencyGraph: DepGraph<FluxActionHandlersGraphNode>;
    _lastID: number;
    _orderedActionHandlers: {
        [ActionType in FluxActionType]?: FluxOrderedActionHandlers<ExtractAction<FluxAction, ActionType>> | Nullish;
    };
    _orderedCallbackTokens: string[] | Nullish;
}

export interface FluxActionHandlersGraphNode {
    actionHandler: Partial<FluxActionHandlerMap>;
    band: FluxDispatchBand;
    /** Store name */
    name: string;
    storeDidChange: FluxActionHandler;
}

export type FluxActionHandlerMap<Action extends FluxAction = FluxAction>
    // Workaround to avoid ts(2589)
    = UnionToIntersection<
        Action extends unknown
            ? { type: never; } extends Action
                ? { [ActionType in Action["type"]]: (action: any) => void; }
                : { [ActionType in Action["type"]]: (action: { type: ActionType; } & Omit<Action, "type">) => void; }
            : never
    >;

export type FluxOrderedActionHandlers<Action extends FluxAction = FluxAction> = {
    actionHandler: FluxActionHandler<Action>;
    /** Store name */
    name: string;
    storeDidChange: FluxActionHandler<Action>;
}[];

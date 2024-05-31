/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { DepGraph } from "dependency-graph";

import type { Nullish } from "../internal";
import type { ExtractAction, FluxAction, FluxActionType } from "./fluxActions";
import type { FluxDispatchBand } from "./FluxDispatcher";

/*
export type FluxActionHandler<Action = FluxAction, Return = void> = Action extends FluxAction
    ? Exclude<keyof OmitIndexSignature<Action>, "type"> extends never
        ? (action: any) => Return
        : (action: Action) => Return
    : never;
*/

export type FluxActionHandler<Action extends FluxAction = FluxAction> = (action: Action) => void;

export type FluxActionHandlerMap<Action extends FluxAction = FluxAction>
    = { [ActionType in Action["type"]]: FluxActionHandler<ExtractAction<Action, ActionType>>; };

interface FluxActionHandlersGraphNode {
    actionHandler: FluxActionHandlerMap;
    band: FluxDispatchBand;
    name: string; // storeName
    storeDidChange: FluxActionHandler;
}

type FluxOrderedActionHandlers<Action extends FluxAction = FluxAction> = {
    actionHandler: FluxActionHandler<Action>;
    name: string; // storeName
    storeDidChange: FluxActionHandler<Action>;
}[];

// Original name: ActionHandlersGraph
export class FluxActionHandlersGraph {
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
    getOrderedActionHandlers<ActionType extends FluxActionType>({ type }: {
        type: ActionType;
    }): FluxOrderedActionHandlers<ExtractAction<FluxAction, ActionType>>;
    register<Action extends FluxAction>(
        storeName: string,
        actionHandlers: FluxActionHandlerMap<Action>,
        storeDidChange: FluxActionHandler<Action>,
        dispatchBand: FluxDispatchBand,
        dispatchToken?: string | undefined
    ): string;

    _dependencyGraph: DepGraph<FluxActionHandlersGraphNode>;
    _lastID: number;
    _orderedActionHandlers: {
        [ActionType in FluxActionType]?: FluxOrderedActionHandlers<ExtractAction<FluxAction, ActionType>> | Nullish;
    };
    _orderedCallbackTokens: string[] | Nullish;
}

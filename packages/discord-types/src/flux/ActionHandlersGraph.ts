/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { DepGraph } from "dependency-graph";

import type { IsAny, Nullish, UnionToIntersection } from "../internal";
import type { Action, ActionHandler, ActionType, ExtractAction } from "./actions";
import type { DispatchBand } from "./Dispatcher";

export declare class ActionHandlersGraph {
    _addToBand(dispatchToken: string, dispatchBand: DispatchBand): void;
    _bandToken(dispatchBand: DispatchBand): string;
    _computeOrderedActionHandlers<T extends ActionType>(
        actionType: T
    ): OrderedActionHandlers<ExtractAction<Action, T>>[];
    _computeOrderedCallbackTokens(): string[];
    _invalidateCaches(): void;
    _validateDependencies(fromDispatchToken: string, toDispatchToken: string): void;
    addDependencies(fromDispatchToken: string, toDispatchTokens: readonly string[]): void;
    createToken(): string;
    getOrderedActionHandlers<T extends ActionType>(partialAction: {
        type: T;
    }): OrderedActionHandlers<ExtractAction<Action, T>>;
    register<A extends Action>(
        storeName: string,
        actionHandlers: ActionHandlerMap<A>,
        storeDidChange: ActionHandler<A>,
        dispatchBand: DispatchBand,
        dispatchToken?: string | undefined /* = this.createToken() */
    ): string;

    _dependencyGraph: DepGraph<ActionHandlersGraphNode>;
    _lastID: number;
    _orderedActionHandlers: {
        [T in ActionType]?: OrderedActionHandlers<ExtractAction<Action, T>> | Nullish;
    };
    _orderedCallbackTokens: string[] | Nullish;
}

export interface ActionHandlersGraphNode {
    actionHandler: Partial<ActionHandlerMap>;
    band: DispatchBand;
    /** Store name */
    name: string;
    storeDidChange: ActionHandler;
}

export type ActionHandlerMap<A extends Action = Action>
    // Workaround to avoid ts(2589)
    = UnionToIntersection<
        A extends unknown
            ? unknown extends (
                IsAny<A[Extract<string, keyof A>]>
                & IsAny<A[Extract<number, keyof A>]>
                & IsAny<A[Extract<symbol, keyof A>]>
            )
                ? Record<A["type"], (action: any) => void>
                : { [T in A["type"]]: (action: A & { type: T; }) => void; }
            : never
    >;

export type OrderedActionHandlers<A extends Action = Action> = {
    actionHandler: ActionHandler<A>;
    /** Store name */
    name: string;
    storeDidChange: ActionHandler<A>;
}[];

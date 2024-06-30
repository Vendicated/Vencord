/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";
import type { FluxActionHandlerMap, FluxActionHandlersGraph } from "./FluxActionHandlersGraph";
import type { FluxActionLogger } from "./FluxActionLogger";
import type { ExtractAction, FluxAction, FluxActionHandler, FluxActionType } from "./fluxActions";

// Original name: Dispatcher
export declare class FluxDispatcher {
    constructor(
        defaultBand?: FluxDispatchBand | undefined /* = FluxDispatchBand.EARLY */,
        actionLogger?: FluxActionLogger | Nullish,
        sentryUtils?: SentryUtils | Nullish
    );

    _dispatch(
        action: FluxAction,
        func: <T>(storeName: string, func: () => T) => T
    ): boolean | undefined;
    _dispatchWithDevtools(action: FluxAction): void;
    _dispatchWithLogging(action: FluxAction): void;
    addDependencies(fromDispatchToken: string, toDispatchTokens: string[]): void;
    addInterceptor(interceptor: FluxActionHandler): void;
    createToken(): string;
    dispatch(action: FluxAction): Promise<void>;
    flushWaitQueue(): void;
    isDispatching(): boolean;
    register<Action extends FluxAction>(
        storeName: string,
        actionHandlers: FluxActionHandlerMap<Action>,
        storeDidChange: FluxActionHandler<Action>,
        dispatchBand?: FluxDispatchBand | Nullish, /* = this._defaultBand */
        dispatchToken?: string | undefined /* = this._actionHandlers.createToken() */
    ): string;
    subscribe<ActionType extends FluxActionType>(
        actionType: ActionType,
        listener: FluxActionHandler<ExtractAction<FluxAction, ActionType>>
    ): void;
    unsubscribe<ActionType extends FluxActionType>(
        actionType: ActionType,
        listener: FluxActionHandler<ExtractAction<FluxAction, ActionType>>
    ): void;
    wait(callback: () => void): void;

    _actionHandlers: FluxActionHandlersGraph;
    _currentDispatchActionType: FluxActionType | Nullish;
    _defaultBand: FluxDispatchBand;
    _interceptors: ((action: FluxAction) => boolean)[];
    _processingWaitQueue: boolean;
    _sentryUtils: SentryUtils | Nullish;
    _subscriptions: {
        [ActionType in FluxActionType]?: Set<FluxActionHandler<ExtractAction<FluxAction, ActionType>>> | Nullish;
    };
    _waitQueue: (() => void)[];
    actionLogger: FluxActionLogger;
    functionCache: Partial<FluxActionHandlerMap>;
}

// Original name: DispatchBand
// Enum keys made screaming snake case for consistency.
export enum FluxDispatchBand {
    EARLY = 0,
    DATABASE = 1,
    DEFAULT = 2,
}

export interface SentryUtils {
    addBreadcrumb: (breadcrumb: {
        category?: string | undefined;
        data?: any;
        level?: string | undefined;
        message?: string | undefined;
        type?: string | undefined;
    }) => void;
}

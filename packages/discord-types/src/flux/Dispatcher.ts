/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";
import type { ActionHandlerMap, ActionHandlersGraph } from "./ActionHandlersGraph";
import type { ActionLogger } from "./ActionLogger";
import type { Action, ActionHandler, ActionType, ExtractAction } from "./actions";

export declare class Dispatcher {
    constructor(
        defaultBand?: DispatchBand | undefined /* = DispatchBand.EARLY */,
        actionLogger?: ActionLogger | Nullish,
        sentryUtils?: SentryUtils | Nullish
    );

    _dispatch(
        action: Action,
        func: <T>(storeName: string, func: () => T) => T
    ): boolean | undefined;
    _dispatchWithDevtools(action: Action): void;
    _dispatchWithLogging(action: Action): void;
    addDependencies(fromDispatchToken: string, toDispatchTokens: readonly string[]): void;
    addInterceptor(interceptor: ActionHandler): void;
    createToken(): string;
    dispatch(action: Action): Promise<void>;
    flushWaitQueue(): void;
    isDispatching(): boolean;
    register<A extends Action>(
        storeName: string,
        actionHandlers: ActionHandlerMap<A>,
        storeDidChange: ActionHandler<A>,
        dispatchBand?: DispatchBand | Nullish, /* = this._defaultBand */
        dispatchToken?: string | undefined /* = this._actionHandlers.createToken() */
    ): string;
    subscribe<T extends ActionType>(
        actionType: T,
        listener: ActionHandler<ExtractAction<Action, T>>): void;
    unsubscribe<T extends ActionType>(
        actionType: T,
        listener: ActionHandler<ExtractAction<Action, T>>
    ): void;
    wait(callback: () => void): void;

    _actionHandlers: ActionHandlersGraph;
    _currentDispatchActionType: ActionType | Nullish;
    _defaultBand: DispatchBand;
    _interceptors: ((action: Action) => boolean)[];
    _processingWaitQueue: boolean;
    _sentryUtils: SentryUtils | Nullish;
    _subscriptions: {
        [T in ActionType]?: Set<ActionHandler<ExtractAction<Action, T>>> | Nullish;
    };
    _waitQueue: (() => void)[];
    actionLogger: ActionLogger;
    functionCache: Partial<ActionHandlerMap>;
}

// Enum keys made screaming snake case for consistency.
export enum DispatchBand {
    EARLY = 0,
    DATABASE = 1,
    DEFAULT = 2,
}

export interface SentryUtils {
    addBreadcrumb: (breadcrumb: {
        category?: string | undefined;
        data?: Record<string, unknown> | undefined;
        event_id?: string | undefined;
        level?: SeverityLevel | undefined;
        message?: string | undefined;
        timestamp?: number | undefined;
        type?: string | undefined;
    }) => void;
}

export enum SeverityLevel {
    DEBUG = "debug",
    ERROR = "error",
    FATAL = "fatal",
    INFO = "info",
    LOG = "log",
    WARNING = "warning",
}

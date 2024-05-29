/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";
import type { FluxActionHandler, FluxActionHandlerMap, FluxActionHandlersGraph } from "./fluxActionHandlers";
import type { ExtractAction, FluxAction, FluxActionLogger, FluxActionType } from "./fluxActions";

export const enum FluxDispatchBand {
    Early = 0,
    Database = 1,
    Default = 2,
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

/*
 * The only reason to make Dispatcher generic with a type parameter for the actions it handles would be to allow plugins
 * to create their own Flux stores with their own actions. However, this would require removing all contravariant properties
 * from Dispatcher so that plugins could create stores with their own Dispatcher instances. This would be required, since
 * the alternative option, allowing plugins to use the main Dispatcher instance, would require removing type information for
 * Discord's actions from Dispatcher, and would introduce the potential for action type name conflicts. Both of these
 * options would harm the main use case of these types. Furthermore, there are other state management libraries bundled with
 * Discord that plugins can use (e.g., Redux, Zustand), and Discord seems to only use one Dispatcher instance (all ~398
 * stores use the same instance), implying that their type for Dispatcher is also not generic.
 */
export class FluxDispatcher {
    constructor(
        defaultBand?: FluxDispatchBand | undefined /* = FluxDispatchBand.Early */,
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
        dispatchBand?: FluxDispatchBand | Nullish,
        dispatchToken?: string | undefined
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
    functionCache: FluxActionHandlerMap;
}

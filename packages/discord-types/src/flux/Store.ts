/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";
import type { ActionHandlerMap } from "./ActionHandlersGraph";
import type { Action } from "./actions";
import type { ChangeListeners } from "./ChangeListeners";
import type { DispatchBand, Dispatcher } from "./Dispatcher";

export declare abstract class Store {
    constructor(
        dispatcher: Dispatcher,
        actionHandlers?: Partial<ActionHandlerMap> | Nullish,
        dispatchBand?: DispatchBand | Nullish /* = dispatcher._defaultBand */
    );

    static destroy(): void;
    /** Undefined on {@link Store}'s constructor. */
    static displayName: string | undefined;
    static getAll(): Store[];
    static initialize(): void;
    static initialized: Promise<void>;

    emitChange(): void;
    getDispatchToken(): string;
    getName(): string;
    initialize(...args: never[]): void;
    initializeIfNeeded(): void;
    mustEmitChanges(
        mustEmitChanges?: ((action: Action) => boolean) | Nullish /* = () => true */
    ): void;
    registerActionHandlers(
        actionHandlers: Partial<ActionHandlerMap>,
        dispatchBand?: DispatchBand | Nullish /* = this._dispatcher._defaultBand */
    ): void;
    syncWith(
        stores: readonly Store[],
        func: () => unknown,
        timeout?: number | Nullish
    ): void;
    waitFor(...stores: Store[]): void;

    __getLocalVars: undefined;
    _changeCallbacks: ChangeListeners;
    _dispatcher: Dispatcher;
    _dispatchToken: string;
    _isInitialized: boolean;
    _mustEmitChanges: ((action: Action) => boolean) | Nullish;
    _reactChangeCallbacks: ChangeListeners;
    _syncWiths: {
        func: () => unknown;
        store: Store;
    }[];
    addChangeListener: ChangeListeners["add"];
    /**
     * @param listener The change listener to add. It will be removed when it returns false.
     */
    addConditionalChangeListener: ChangeListeners["addConditional"];
    addReactChangeListener: ChangeListeners["add"];
    removeChangeListener: ChangeListeners["remove"];
    removeReactChangeListener: ChangeListeners["remove"];
}

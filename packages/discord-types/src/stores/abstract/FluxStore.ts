/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxActionHandlerMap } from "../../flux/FluxActionHandlersGraph";
import type { FluxAction } from "../../flux/fluxActions";
import type { FluxChangeListeners } from "../../flux/FluxChangeListeners";
import type { FluxDispatchBand, FluxDispatcher } from "../../flux/FluxDispatcher";
import type { Nullish } from "../../internal";

// Original name: Store
export declare abstract class FluxStore {
    constructor(
        dispatcher: FluxDispatcher,
        actionHandlers?: Partial<FluxActionHandlerMap> | Nullish,
        dispatchBand?: FluxDispatchBand | Nullish /* = dispatcher._defaultBand */
    );

    static destroy(): void;
    /** Undefined on {@link FluxStore}'s constructor. */
    static displayName: string | undefined;
    static getAll(): FluxStore[];
    static initialize(): void;
    static initialized: Promise<void>;

    emitChange(): void;
    getDispatchToken(): string;
    getName(): string;
    initialize(...args: never[]): void;
    initializeIfNeeded(): void;
    mustEmitChanges(
        mustEmitChanges?: ((action: FluxAction) => boolean) | Nullish /* = () => true */
    ): void;
    registerActionHandlers(
        actionHandlers: Partial<FluxActionHandlerMap>,
        dispatchBand?: FluxDispatchBand | Nullish /* = this._dispatcher._defaultBand */
    ): void;
    syncWith(
        stores: readonly FluxStore[],
        func: () => unknown,
        timeout?: number | Nullish
    ): void;
    waitFor(...stores: FluxStore[]): void;

    __getLocalVars: undefined;
    _changeCallbacks: FluxChangeListeners;
    _dispatcher: FluxDispatcher;
    _dispatchToken: string;
    _isInitialized: boolean;
    _mustEmitChanges: ((action: FluxAction) => boolean) | Nullish;
    _reactChangeCallbacks: FluxChangeListeners;
    _syncWiths: {
        func: () => unknown;
        store: FluxStore;
    }[];
    addChangeListener: FluxChangeListeners["add"];
    /**
     * @param listener The change listener to add. It will be removed when it returns false.
     */
    addConditionalChangeListener: FluxChangeListeners["addConditional"];
    addReactChangeListener: FluxChangeListeners["add"];
    removeChangeListener: FluxChangeListeners["remove"];
    removeReactChangeListener: FluxChangeListeners["remove"];
}

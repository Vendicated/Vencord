/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxActionHandlerMap } from "../../flux/FluxActionHandlersGraph";
import type { FluxAction } from "../../flux/fluxActions";
import type { FluxDispatchBand, FluxDispatcher } from "../../flux/FluxDispatcher";
import type { Bivariant, Nullish } from "../../internal";

// Original name: Store
export declare abstract class FluxStore<Action extends FluxAction = FluxAction> {
    constructor(
        dispatcher: FluxDispatcher,
        actionHandlers?: FluxActionHandlerMap<Action> | Nullish,
        dispatchBand?: FluxDispatchBand | Nullish /* = dispatcher._defaultBand */
    );

    static destroy(): void;
    /** Undefined on FluxStore's constructor. */
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
        mustEmitChanges?: ((action: Action) => boolean) | Nullish /* = () => true */
    ): void;
    registerActionHandlers(
        actionHandlers: FluxActionHandlerMap<Action>,
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
    _mustEmitChanges: Bivariant<((action: Action) => boolean)> | Nullish;
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

// Original name: ChangeListeners
export declare class FluxChangeListeners {
    has(listener: FluxChangeListener): boolean;
    hasAny(): boolean;
    invokeAll(): void;

    add: (listener: FluxChangeListener<false>) => void;
    /**
     * @param listener The change listener to add. It will be removed when it returns false.
     */
    addConditional: (
        listener: FluxChangeListener<true>,
        immediatelyCall?: boolean | undefined /* = true */
    ) => void;
    listeners: Set<FluxChangeListener>;
    remove: (listener: FluxChangeListener) => void;
}

export type FluxChangeListener<Conditional extends boolean = boolean>
    = true extends Conditional
        ? () => unknown
        : () => void;

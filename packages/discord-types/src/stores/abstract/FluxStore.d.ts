/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxActionHandlerMap } from "../../flux/fluxActionHandlers";
import type { FluxAction } from "../../flux/fluxActions";
import type { FluxDispatchBand, FluxDispatcher } from "../../flux/FluxDispatcher";
import type { Nullish } from "../../internal";

// Original name: Store
export abstract class FluxStore<Action extends FluxAction = FluxAction> {
    constructor(
        dispatcher: FluxDispatcher,
        actionHandlers: FluxActionHandlerMap<Action>,
        dispatchBand?: FluxDispatchBand | Nullish
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
    initialize(...args: unknown[]): void;
    initializeIfNeeded(): void;
    mustEmitChanges(
        mustEmitChanges?: ((action: Action) => boolean) | Nullish /* = () => true */
    ): void;
    registerActionHandlers(
        actionHandlers: FluxActionHandlerMap<Action>,
        dispatchBand?: FluxDispatchBand | Nullish
    ): void;
    syncWith(
        stores: FluxStore[],
        func: FluxSyncWithFunction,
        timeout?: number | Nullish
    ): void;
    waitFor(...stores: FluxStore[]): void;

    __getLocalVars: undefined;
    _changeCallbacks: FluxChangeListeners;
    _dispatcher: FluxDispatcher;
    _dispatchToken: string;
    _isInitialized: boolean;
    _mustEmitChanges: ((action: Action) => boolean) | Nullish;
    _reactChangeCallbacks: FluxChangeListeners;
    _syncWiths: {
        func: FluxSyncWithFunction;
        store: FluxStore;
    }[];
    addChangeListener: FluxChangeListeners["add"];
    addConditionalChangeListener: FluxChangeListeners["addConditional"];
    addReactChangeListener: FluxChangeListeners["add"];
    removeChangeListener: FluxChangeListeners["remove"];
    removeReactChangeListener: FluxChangeListeners["remove"];
}

export type FluxSyncWithFunction = () => boolean | undefined;

// Original name: ChangeListeners
export class FluxChangeListeners {
    has(listener: FluxChangeListener): boolean;
    hasAny(): boolean;
    invokeAll(): void;

    add: (listener: FluxChangeListener) => void;
    addConditional: (
        listener: FluxChangeListener,
        immediatelyCall?: boolean | undefined /* = true */
    ) => void;
    listeners: Set<FluxChangeListener>;
    remove: (listener: FluxChangeListener) => void;
}

export type FluxChangeListener = () => boolean;

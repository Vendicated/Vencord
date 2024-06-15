/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxActionHandlerMap } from "../../flux/FluxActionHandlersGraph";
import type { FluxAction } from "../../flux/fluxActions";
import type { FluxDispatcher } from "../../flux/FluxDispatcher";
import type { GenericConstructor, Nullish } from "../../internal";
import type { FluxStore } from "./FluxStore";

// Original name: PersistedStore
export declare abstract class FluxPersistedStore<
    Constructor extends GenericConstructor = GenericConstructor,
    State = unknown,
    Action extends FluxAction = FluxAction
> extends FluxStore<Action> {
    constructor(dispatcher: FluxDispatcher, actionHandlers: FluxActionHandlerMap<Action>);

    static _clearAllPromise: Promise<void> | Nullish;
    static _writePromises: Map</* persistKey: */string, Promise<void>>;
    static _writeResolvers: Map</* persistKey: */string, [resolver: () => void, callbackId: number]>;
    static allPersistKeys: Set<string>;
    static clearAll(options: FluxPersistedStoreClearOptions): Promise<void>;
    static clearPersistQueue(options: FluxPersistedStoreClearOptions): void;
    static disableWrite: boolean;
    static disableWrites: boolean;
    static getAllStates(): Promise<{ [persistKey: string]: unknown; }>;
    static initializeAll(stateMap: { [persistKey: string]: unknown; }): void;
    /**
     * If {@link clearAll} has been called for the specified persist key, state in the returned object will be undefined.
     */
    static migrateAndReadStoreState<NewestState = unknown, OldStates extends unknown[] = unknown[]>(
        persistKey: string,
        migrations?: FluxPersistedStoreMigrations<[...OldStates, NewestState]> | Nullish
    ): { requiresPersist: boolean; state: NewestState; } | { requiresPersist: false; state: undefined; };
    static migrations: ((oldState: any) => unknown)[] | undefined;
    static persistKey: string; // abstract
    static shouldClear(options: FluxPersistedStoreClearOptions, persistKey: string): boolean;
    static throttleDelay: number;
    static userAgnosticPersistKeys: Set<string>;

    asyncPersist(): Promise<boolean | undefined>;
    clear(): void;
    getClass(): Constructor;
    abstract getState(): State;
    abstract initialize(state: State): void;
    initializeFromState(state: State): void;
    persist(): void;

    _version: number;
    callback: (callback: () => void) => void;
    throttledCallback: {
        (callback: () => void): () => void;
        cancel: () => void;
        flush: () => () => void;
    };
}

export interface FluxPersistedStoreClearOptions {
    /** Array of persist keys. */
    omit?: string[] | Nullish;
    type: "all" | "user-data-only";
}

type MigrationsFromTuple<States extends unknown[]>
    = States extends [infer OldState, infer NewState, ...infer NewerStates]
        ? [(oldState: OldState) => NewState, ...MigrationsFromTuple<[NewState, ...NewerStates]>]
        : [];

export type FluxPersistedStoreMigrations<States extends unknown[] = unknown[]>
    = States extends [infer OldState, ...infer NewerStates]
        ? NewerStates extends []
            ? [(oldState: OldState) => unknown]
            : MigrationsFromTuple<States>
        : States extends (infer T)[]
            ? ((oldState: T) => T)[]
            : never;

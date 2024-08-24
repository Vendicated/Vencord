/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxActionHandlerMap } from "../../flux/FluxActionHandlersGraph";
import type { FluxDispatcher } from "../../flux/FluxDispatcher";
import type { GenericConstructor, Nullish } from "../../internal";
import type { FluxStore } from "./FluxStore";

// Original name: PersistedStore
export declare abstract class FluxPersistedStore<
    Constructor extends GenericConstructor = GenericConstructor,
    State = unknown
> extends FluxStore {
    constructor(dispatcher: FluxDispatcher, actionHandlers: Partial<FluxActionHandlerMap>);

    static _clearAllPromise: Promise<void> | Nullish;
    static _writePromises: Map</* persistKey: */string, Promise<void>>;
    static _writeResolvers: Map</* persistKey: */string, [resolver: () => void, callbackId: number]>;
    static allPersistKeys: Set<string>;
    static clearAll(options: FluxPersistedStoreClearOptions): Promise<void>;
    static clearPersistQueue(options: FluxPersistedStoreClearOptions): void;
    static disableWrite: boolean;
    static disableWrites: boolean;
    static getAllStates(): Promise<{ [persistKey: string]: unknown; }>;
    static initializeAll(stateMap: { [persistKey: string]: unknown; } & Pick<Object, "hasOwnProperty">): void;
    /**
     * If {@link clearAll} has been called for the specified persist key, state in the returned object will be undefined.
     */
    static migrateAndReadStoreState<
        States extends readonly [unknown, ...unknown[]] | readonly [...unknown[], unknown] = [unknown]
    >(
        persistKey: string,
        ...migrations: [] extends FluxPersistedStoreMigrations<States>
            ? [migrations?: FluxPersistedStoreMigrations<States> | Nullish]
            : [migrations: FluxPersistedStoreMigrations<States>]
    ): { requiresPersist: true; state: Tail<States>; } | { requiresPersist: false; state: undefined; };
    static migrations: ((oldState: never) => unknown)[] | undefined;
    /**
     * Not present on {@link FluxPersistedStore}'s constructor.
     * All subclasses are required to define their own.
     */
    static persistKey: string;
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
    /** Array of persist keys */
    omit?: readonly string[] | Nullish;
    type: "all" | "user-data-only";
}

export type FluxPersistedStoreMigrations<
    States extends readonly [unknown, ...unknown[]] | readonly [...unknown[], unknown]
>
    = States extends readonly [...infer OldStates, infer NewState]
        ? OldStates extends [...infer OlderStates, infer OldState]
            ? [...FluxPersistedStoreMigrations<[...OlderStates, OldState]>, (oldState: OldState) => NewState]
            : OldStates extends []
                ? []
                : OldStates extends (infer T)[]
                    ? [] | [...((oldState: T) => T)[], (oldState: T) => NewState]
                    : never
        : FluxPersistedStoreMigrationsTrailingRest<States>;

type FluxPersistedStoreMigrationsTrailingRest<States extends readonly unknown[]>
    = States extends readonly [infer OldState, ...infer NewStates]
        ? NewStates extends [infer NewState, ...infer NewerStates]
            ? [(oldState: OldState) => NewState, ...FluxPersistedStoreMigrationsTrailingRest<[NewState, ...NewerStates]>]
            : NewStates extends []
                ? []
                : NewStates extends (infer T)[]
                    ? [] | [(oldState: OldState) => T, ...((oldState: T) => T)[]]
                    : never
        : never;

type Tail<T extends readonly [unknown, ...unknown[]] | readonly [...unknown[], unknown]>
    = T extends readonly [...unknown[], infer U]
        ? U
        : TailTrailingRest<T>;

type TailTrailingRest<T extends readonly unknown[]>
    = T extends readonly [infer U, ...infer V]
        ? V extends [unknown, ...unknown[]]
            ? TailTrailingRest<V>
            : V extends (infer W)[]
                ? U | W
                : never
        : never;

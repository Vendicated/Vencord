/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { GenericConstructor, Nullish } from "../internal";
import type { ActionHandlerMap } from "./ActionHandlersGraph";
import type { Dispatcher } from "./Dispatcher";
import type { Store } from "./Store";

export declare abstract class PersistedStore<
    Constructor extends GenericConstructor = GenericConstructor,
    State = unknown
> extends Store {
    constructor(dispatcher: Dispatcher, actionHandlers: Partial<ActionHandlerMap>);

    static _clearAllPromise: Promise<void> | Nullish;
    static _writePromises: Map</* persistKey: */string, Promise<void>>;
    static _writeResolvers: Map</* persistKey: */string, [resolver: () => void, callbackId: number]>;
    static allPersistKeys: Set<string>;
    static clearAll(options: PersistedStoreClearOptions): Promise<void>;
    static clearPersistQueue(options: PersistedStoreClearOptions): void;
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
        ...migrations: [] extends PersistedStoreMigrations<States>
            ? [migrations?: PersistedStoreMigrations<States> | Nullish]
            : [migrations: PersistedStoreMigrations<States>]
    ): { requiresPersist: true; state: Tail<States>; } | { requiresPersist: false; state: undefined; };
    static migrations: ((oldState: never) => unknown)[] | undefined;
    /**
     * Not present on {@link PersistedStore}'s constructor.
     * All subclasses are required to define their own.
     */
    static persistKey: string;
    static shouldClear(options: PersistedStoreClearOptions, persistKey: string): boolean;
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

export interface PersistedStoreClearOptions {
    /** Array of persist keys */
    omit?: readonly string[] | Nullish;
    type: "all" | "user-data-only";
}

export type PersistedStoreMigrations<
    States extends readonly [unknown, ...unknown[]] | readonly [...unknown[], unknown]
>
    = States extends readonly [...infer OldStates, infer NewState]
        ? OldStates extends [...infer OlderStates, infer OldState]
            ? [...PersistedStoreMigrations<[...OlderStates, OldState]>, (oldState: OldState) => NewState]
            : OldStates extends []
                ? []
                : OldStates extends (infer T)[]
                    ? [] | [...((oldState: T) => T)[], (oldState: T) => NewState]
                    : never
        : PersistedStoreMigrationsTrailingRest<States>;

type PersistedStoreMigrationsTrailingRest<States extends readonly unknown[]>
    = States extends readonly [infer OldState, ...infer NewStates]
        ? NewStates extends [infer NewState, ...infer NewerStates]
            ? [(oldState: OldState) => NewState, ...PersistedStoreMigrationsTrailingRest<[NewState, ...NewerStates]>]
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

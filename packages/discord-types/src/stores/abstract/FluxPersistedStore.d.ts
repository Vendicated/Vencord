/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxActionHandlerMap } from "../../flux/fluxActionHandlers";
import type { FluxAction } from "../../flux/fluxActions";
import type { FluxDispatcher } from "../../flux/FluxDispatcher";
import type { GenericConstructor, Nullish } from "../../internal";
import type { FluxStore } from "./FluxStore";

// Original name: PersistedStore
export abstract class FluxPersistedStore<
    Constructor extends GenericConstructor = GenericConstructor,
    State = any,
    Action extends FluxAction = FluxAction
> extends FluxStore<Action> {
    constructor(dispatcher: FluxDispatcher, actionHandlers: FluxActionHandlerMap<Action>);

    static _clearAllPromise: Promise<void> | Nullish;
    static _writePromises: Map<any, any>; // TEMP
    static _writeResolvers: Map<any, any>; // TEMP
    static allPersistKeys: Set<string>;
    static clearAll(e: any): Promise<void>; // TEMP
    static clearPersistQueue(e: any): void; // TEMP
    static disableWrite: boolean;
    static disableWrites: boolean;
    static getAllStates(): Promise<any>; // TEMP
    static initializeAll(stateMap: Record<string, any>): void; // TEMP
    static migrateAndReadStoreState(e: any, t: any): { // TEMP
        requiresPersist: boolean;
        state: any /* | undefined */; // TEMP
    };
    static migrations: ((...args: any[]) => any)[] | undefined;
    static persistKey: string; // not actually defined on PersistedStore's constructor, but all subclasses are required to have it
    static shouldClear(e: any, t: any): boolean; // TEMP
    static throttleDelay: number;
    static userAgnosticPersistKeys: Set<string>;

    asyncPersist(): Promise<boolean | undefined>;
    clear(): void;
    getClass(): Constructor;
    abstract getState(): State; // TEMP
    abstract initialize(state: State): void; // TEMP
    initializeFromState(state: State): void; // TEMP
    persist(): void;

    _version: number;
    callback: (callback: () => void) => void;
    throttledCallback: {
        (callback: () => void): () => void;
        cancel: () => void;
        flush: () => () => void;
    };
}

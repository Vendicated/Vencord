/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "./Store";

export declare class Emitter {
    batched<T>(callback: () => T): T;
    destroy(): void;
    emit(): void;
    emitNonReactOnce(syncWiths: Set<() => unknown>, changedStores: Set<Store>): void;
    emitReactOnce(): void;
    getChangeSentinel(): number;
    getIsPaused(): boolean;
    injectBatchEmitChanges(batchEmitChanges: () => unknown): void;
    markChanged(store: Store): void;
    /** If timeout is omitted, Emitter will pause until resume is called. */
    pause(timeout?: number | undefined): void;
    resume(shouldEmit?: boolean | undefined /* = true */): void;

    changedStores: Set<Store>;
    changeSentinel: number;
    isBatchEmitting: boolean;
    isDispatching: boolean;
    isPaused: boolean;
    pauseTimer: number | null;
    reactChangedStores: Set<Store>;
}

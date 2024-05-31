/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxStore, FluxSyncWithFunction } from "../stores/abstract/FluxStore";

// Original name: Emitter
export class FluxEmitter {
    batched<T>(callback: () => T): T;
    destroy(): void;
    emit(): void;
    emitNonReactOnce(syncWiths: Set<FluxSyncWithFunction>, changedStores: Set<FluxStore>): void;
    emitReactOnce(): void;
    getChangeSentinel(): number;
    getIsPaused(): boolean;
    injectBatchEmitChanges(batchEmitChanges: () => unknown): void;
    markChanged(store: FluxStore): void;
    pause(timeout?: number | undefined): void;
    resume(shouldEmit?: boolean | undefined): void;

    changedStores: Set<FluxStore>;
    changeSentinel: number;
    isBatchEmitting: boolean;
    isDispatching: boolean;
    isPaused: boolean;
    pauseTimer: number | null;
    reactChangedStores: Set<FluxStore>;
}

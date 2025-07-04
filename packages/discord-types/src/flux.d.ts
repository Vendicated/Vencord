import { FluxStore } from "./stores/FluxStore";

export class FluxEmitter {
    constructor();

    changeSentinel: number;
    changedStores: Set<FluxStore>;
    isBatchEmitting: boolean;
    isDispatching: boolean;
    isPaused: boolean;
    pauseTimer: NodeJS.Timeout | null;
    reactChangedStores: Set<FluxStore>;

    batched(batch: (...args: any[]) => void): void;
    destroy(): void;
    emit(): void;
    emitNonReactOnce(): void;
    emitReactOnce(): void;
    getChangeSentinel(): number;
    getIsPaused(): boolean;
    injectBatchEmitChanges(batch: (...args: any[]) => void): void;
    markChanged(store: FluxStore): void;
    pause(): void;
    resume(): void;
}

export interface Flux {
    Store: typeof FluxStore;
    Emitter: FluxEmitter;
}

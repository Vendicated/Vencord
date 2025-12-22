import { FluxDispatcher, FluxEvents } from "..";

type Callback = () => void;
type SyncCallback = () => boolean | void;

/*
  For some reason, this causes type errors when you try to destructure it:
  ```ts
  interface FluxEvent {
      type: FluxEvents;
      [key: string]: any;
  }
  ```
 */
export type FluxEvent = any;

export type ActionHandler = (event: FluxEvent) => void;
export type ActionHandlers = Partial<Record<FluxEvents, ActionHandler>>;

export class FluxStore {
    constructor(dispatcher: FluxDispatcher, actionHandlers?: ActionHandlers, band?: number);

    getName(): string;

    addChangeListener(callback: Callback): void;
    /** Listener will be removed once the callback returns false. Preemptive (default true) calls callback immediately. */
    addConditionalChangeListener(callback: () => boolean, preemptive?: boolean): void;
    addReactChangeListener(callback: Callback): void;
    removeChangeListener(callback: Callback): void;
    removeReactChangeListener(callback: Callback): void;

    doEmitChanges(event: FluxEvent): void;
    emitChange(): void;

    getDispatchToken(): string;
    initialize(): void;
    initializeIfNeeded(): void;
    /** Sets a callback to check if changes must emit during paused dispatch. Defaults to () => true if called without args. */
    mustEmitChanges(callback?: ActionHandler): void;
    registerActionHandlers(actionHandlers: ActionHandlers, band?: number): void;
    /** Syncs this store with other stores. Callback returning false skips emitChange. Timeout enables debounce. */
    syncWith(stores: FluxStore[], callback: SyncCallback, timeout?: number): void;
    waitFor(...stores: FluxStore[]): void;

    static getAll(): FluxStore[];
}

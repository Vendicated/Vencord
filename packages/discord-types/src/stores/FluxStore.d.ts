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
/** keyed by FluxEvents action type */
export type ActionHandlers = Partial<Record<FluxEvents, ActionHandler>>;

/**
 * Base class for all Discord Flux stores.
 * Provides change notification, action handling, and store synchronization.
 */
export class FluxStore {
    /**
     * @param dispatcher the FluxDispatcher instance to register with
     * @param actionHandlers handlers for Flux actions, keyed by action type
     * @param band priority band for action handling (default 2), lower runs first
     */
    constructor(dispatcher: FluxDispatcher, actionHandlers?: ActionHandlers, band?: number);

    /** returns displayName if set, otherwise constructor.name */
    getName(): string;

    /** adds listener to _changeCallbacks, invoked before react listeners and triggers syncWith processing */
    addChangeListener(callback: Callback): void;
    /**
     * adds a listener that auto-removes when callback returns false.
     * @param callback returning false removes the listener
     * @param preemptive if true (default), calls callback immediately and skips adding if it returns false
     */
    addConditionalChangeListener(callback: () => boolean, preemptive?: boolean): void;
    /** adds listener to _reactChangeCallbacks, invoked after all regular change listeners complete */
    addReactChangeListener(callback: Callback): void;
    removeChangeListener(callback: Callback): void;
    removeReactChangeListener(callback: Callback): void;

    /** called by dispatcher after action handlers run, marks changed if listeners exist and may resume paused dispatch */
    doEmitChanges(event: FluxEvent): void;
    /** marks store as changed for batched listener notification */
    emitChange(): void;

    /** unique token identifying this store in the dispatcher */
    getDispatchToken(): string;
    /** override to set up initial state, called once by initializeIfNeeded */
    initialize(): void;
    /** calls initialize() if not already initialized, adds performance mark if init takes >5ms */
    initializeIfNeeded(): void;
    /**
     * sets callback to determine if changes must emit during paused dispatch.
     * @param callback if omitted, defaults to () => true (always emit)
     */
    mustEmitChanges(callback?: ActionHandler): void;
    /**
     * registers additional action handlers after construction.
     * @param actionHandlers handlers keyed by action type
     * @param band priority band, lower runs first
     */
    registerActionHandlers(actionHandlers: ActionHandlers, band?: number): void;
    /**
     * syncs this store with other stores, re-emitting when they change.
     * without timeout: synchronous, callback runs during emitNonReactOnce.
     * with timeout: debounced, adds regular change listener to each source store.
     * @param stores stores to sync with
     * @param callback returning false skips emitChange on this store
     * @param timeout if provided, debounces the sync callback
     */
    syncWith(stores: FluxStore[], callback: SyncCallback, timeout?: number): void;
    /** adds dispatcher dependencies so this store's handlers run after the specified stores */
    waitFor(...stores: FluxStore[]): void;

    /** initializes all registered stores, called once at app startup */
    static initialize(): void;
    /** clears all registered stores and destroys the change listener system */
    static destroy(): void;
    /** returns all registered FluxStore instances */
    static getAll(): FluxStore[];
}

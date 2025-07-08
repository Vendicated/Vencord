import { FluxDispatcher, FluxEvents } from "..";

type Callback = () => void;

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
    constructor(dispatcher: FluxDispatcher, actionHandlers?: ActionHandlers);

    getName(): string;

    addChangeListener(callback: Callback): void;
    /** Listener will be removed once the callback returns false. */
    addConditionalChangeListener(callback: () => boolean, preemptive?: boolean): void;
    addReactChangeListener(callback: Callback): void;
    removeChangeListener(callback: Callback): void;
    removeReactChangeListener(callback: Callback): void;

    doEmitChanges(event: FluxEvent): void;
    emitChange(): void;

    getDispatchToken(): string;
    initialize(): void;
    initializeIfNeeded(): void;
    /** this is a setter */
    mustEmitChanges(actionHandler: ActionHandler | undefined): void;
    registerActionHandlers(actionHandlers: ActionHandlers): void;
    syncWith(stores: FluxStore[], callback: Callback, timeout?: number): void;
    waitFor(...stores: FluxStore[]): void;

    static getAll(): FluxStore[];
}

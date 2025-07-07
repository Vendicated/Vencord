import { FluxDispatcher, FluxEvents } from "..";

type GenericFunction = (...args: any[]) => any;

export class FluxStore {
    constructor(dispatcher: FluxDispatcher, eventHandlers?: Partial<Record<FluxEvents, (data: any) => void>>);

    addChangeListener(callback: () => void): void;
    addReactChangeListener(callback: () => void): void;
    removeChangeListener(callback: () => void): void;
    removeReactChangeListener(callback: () => void): void;
    emitChange(): void;
    getDispatchToken(): string;
    getName(): string;
    initialize(): void;
    initializeIfNeeded(): void;
    registerActionHandlers: GenericFunction;
    syncWith: GenericFunction;
    waitFor: GenericFunction;

    static getAll(): FluxStore[];
}

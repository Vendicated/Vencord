// Small runtime-like augmentations to ease migration from JS patterns to strict TS.
// These are intended as short-term compatibility shims for the repo's existing code.

interface ArrayIterator<T> {
    // project uses .values().map(...) / .values().filter(...) in many places — accept broad signatures
    map?<U>(fn: (v: T, i?: number) => U): U[];
    filter?<S extends T>(fn: (v: T, i?: number) => v is S): S[];
    filter?(fn: (v: T, i?: number) => boolean): T[];
    toArray?(): T[];
    take?(n: number): T[];
}

interface Set<T> {
    // repo uses Set.intersection — add a common helper
    intersection?(other: Set<T> | Iterable<T>): Set<T>;
}

declare global {
    // allow Array.from to be used in places where .values() was used
    interface Array<T> {
        toArray?(): T[];
        take?(n: number): T[];
    }

    // Provide a loose Iterator type that has chainable helpers used in codebase
    interface Iterator<T> {
        map?<U>(fn: (v: T, i?: number) => U): U[];
        filter?<S extends T>(fn: (v: T, i?: number) => v is S): S[];
        filter?(fn: (v: T, i?: number) => boolean): T[];
        toArray?(): T[];
        take?(n: number): T[];
    }

    // The iterator returned by Array.prototype.values()
    interface IterableIterator<T> {
        map?<U>(fn: (v: T, i?: number) => U): U[];
        filter?<S extends T>(fn: (v: T, i?: number) => v is S): S[];
        filter?(fn: (v: T, i?: number) => boolean): T[];
        toArray?(): T[];
        take?(n: number): T[];
    }
}

export {};

declare global {
    interface PromiseConstructor {
        // Small helper found in the runtime: returns [promise, resolve, reject]
        withResolvers?<T = void>(): { promise: Promise<T>; resolve: (v: T | PromiseLike<T>) => void; reject: (e?: any) => void };
    }
}

// Small global augmentations to match runtime helpers used in the codebase
interface Set<T> {
    // permissive declaration for Set.prototype.intersection used in some plugins
    intersection?(other: Iterable<T>): Set<T>;
}

// Iterable helper convenience methods that some code expects (safe, permissive)
interface IterableIterator<T> {
    map?<U>(fn: (t: T, i?: number) => U): U[];
    filter?<S extends T>(fn: (t: T, i?: number) => t is S): S[];
    toArray?(): T[];
    take?(n: number): T[];
}

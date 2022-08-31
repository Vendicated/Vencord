import { React } from "../webpack";

/**
 * Makes a lazy function. On first call, the value is computed.
 * On subsequent calls, the same computed value will be returned
 * @param factory Factory function
 */
export function lazy<T>(factory: () => T): () => T {
    let cache: T;
    return () => {
        return cache ?? (cache = factory());
    };
}

/**
 * Await a promise
 * @param factory Factory
 * @param fallbackValue The fallback value that will be used until the promise resolved
 * @returns A state that will either be null or the result of the promise
 */
export function useAwaiter<T>(factory: () => Promise<T>, fallbackValue: T | null = null): T | null {
    const [res, setRes] = React.useState<T | null>(fallbackValue);

    React.useEffect(() => {
        factory().then(setRes);
    }, []);

    return res;
}

/**
 * A lazy component. The factory method is called on first render. For example useful
 * for const Component = LazyComponent(() => findByDisplayName("...").default)
 * @param factory Function returning a Component
 * @returns Result of factory function
 */
export function LazyComponent<T = any>(factory: () => React.ComponentType<T>) {
    return (props: T) => {
        const Component = React.useMemo(factory, []);
        return <Component {...props} />;
    };
}

/**
 * Recursively merges defaults into an object and returns the same object 
 * @param obj Object
 * @param defaults Defaults
 * @returns obj
 */
export function mergeDefaults<T>(obj: T, defaults: T): T {
    for (const key in defaults) {
        const v = defaults[key];
        if (typeof v === "object" && !Array.isArray(v)) {
            obj[key] ??= {} as any;
            mergeDefaults(obj[key], v);
        } else {
            obj[key] ??= v;
        }
    }
    return obj;
}
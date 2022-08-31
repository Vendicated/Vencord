import { React } from "../webpack/common";

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
 * @returns [value, error, isPending]
 */
export function useAwaiter<T>(factory: () => Promise<T>): [T | null, any, boolean];
export function useAwaiter<T>(factory: () => Promise<T>, fallbackValue: T): [T, any, boolean];
export function useAwaiter<T>(factory: () => Promise<T>, fallbackValue: T | null = null): [T | null, any, boolean] {
    const [state, setState] = React.useState({
        value: fallbackValue,
        error: null as any,
        pending: true
    });

    React.useEffect(() => {
        let isAlive = true;
        factory()
            .then(value => isAlive && setState({ value, error: null, pending: false }))
            .catch(error => isAlive && setState({ value: null, error, pending: false }));

        return () => void (isAlive = false);
    }, []);

    return [state.value, state.error, state.pending];
};

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
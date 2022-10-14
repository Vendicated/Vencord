import { makeLazy } from "./misc";

/**
 * Wraps the result of {@see makeLazy} in a Proxy you can consume as if it wasn't lazy.
 * On first property access, the lazy is evaluated
 * @param factory lazy factory
 * @returns Proxy
 *
 * Note that the example below exists already as an api, see {@link lazyWebpack}
 * @example const mod = proxyLazy(makeLazy(() => findByProps("blah"))); console.log(mod.blah);
 */
export function proxyLazy<T>(factory: () => T): T {
    const lazy = makeLazy(factory);

    return new Proxy(() => null, {
        get: (_, prop) => lazy()[prop],
        set: (_, prop, value) => lazy()[prop] = value,
        has: (_, prop) => prop in lazy(),
        apply: (_, $this, args) => (lazy() as Function).apply($this, args),
        ownKeys: () => Reflect.ownKeys(lazy() as object),
        construct: (_, args, newTarget) => Reflect.construct(lazy() as Function, args, newTarget),
        deleteProperty: (_, prop) => delete lazy()[prop],
        defineProperty: (_, property, attributes) => !!Object.defineProperty(lazy(), property, attributes)
    }) as any as T;
}

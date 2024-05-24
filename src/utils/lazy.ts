/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AnyObject } from "./types";

export type ProxyLazy<T = AnyObject> = T & {
    [proxyLazyGet]: () => T;
    [proxyLazyCache]: T | undefined;
};

export const proxyLazyGet = Symbol.for("vencord.lazy.get");
export const proxyLazyCache = Symbol.for("vencord.lazy.cached");

export function makeLazy<T>(factory: () => T, attempts = 5, { isIndirect = false }: { isIndirect?: boolean; } = {}): () => T {
    let tries = 0;
    let cache: T;

    const getter = () => {
        if (!cache && attempts > tries) {
            tries++;
            cache = factory();
            if (!cache && attempts === tries && !isIndirect) {
                console.error(`makeLazy factory failed:\n\n${factory}`);
            }
        }

        return cache;
    };

    getter.$$vencordLazyFailed = () => tries === attempts;

    return getter;
}

// Proxies demand that these properties be unmodified, so proxyLazy
// will always return the function default for them.
const unconfigurable = ["arguments", "caller", "prototype"];

const handler: ProxyHandler<any> = {
    ...Object.fromEntries(Object.getOwnPropertyNames(Reflect).map(propName =>
        [propName, (target: any, ...args: any[]) => Reflect[propName](target[proxyLazyGet](), ...args)]
    )),
    ownKeys: target => {
        const keys = Reflect.ownKeys(target[proxyLazyGet]());
        for (const key of unconfigurable) {
            if (!keys.includes(key)) keys.push(key);
        }
        return keys;
    },
    getOwnPropertyDescriptor: (target, p) => {
        if (typeof p === "string" && unconfigurable.includes(p))
            return Reflect.getOwnPropertyDescriptor(target, p);

        const descriptor = Reflect.getOwnPropertyDescriptor(target[proxyLazyGet](), p);
        if (descriptor) Object.defineProperty(target, p, descriptor);
        return descriptor;
    }
};

/**
 * Wraps the result of factory in a Proxy you can consume as if it wasn't lazy.
 * On first property access, the factory is evaluated
 * @param factory Factory returning the result
 * @param attempts How many times to try to evaluate the factory before giving up
 * @returns Result of factory function
 */
export function proxyLazy<T = AnyObject>(factory: () => T, attempts = 5, isChild = false): ProxyLazy<T> {
    const get = makeLazy(factory, attempts, { isIndirect: true });

    let isSameTick = true;
    if (!isChild) setTimeout(() => isSameTick = false, 0);

    const proxyDummy = Object.assign(function ProxyDummy() { }, {
        [proxyLazyGet]() {
            if (!proxyDummy[proxyLazyCache]) {
                // @ts-ignore
                if (!get.$$vencordLazyFailed()) {
                    proxyDummy[proxyLazyCache] = get();
                }

                if (!proxyDummy[proxyLazyCache]) {
                    throw new Error(`proxyLazy factory failed:\n\n${factory}`);
                } else {
                    if (typeof proxyDummy[proxyLazyCache] === "function") {
                        proxy.toString = proxyDummy[proxyLazyCache].toString.bind(proxyDummy[proxyLazyCache]);
                    }
                }
            }

            return proxyDummy[proxyLazyCache];
        },
        [proxyLazyCache]: void 0 as T | undefined
    });

    const proxy = new Proxy(proxyDummy, {
        ...handler,
        get(target, p, receiver) {
            if (p === proxyLazyGet) return target[proxyLazyGet];
            if (p === proxyLazyCache) return target[proxyLazyCache];

            // If we're still in the same tick, it means the lazy was immediately used.
            // thus, we lazy proxy the get access to make things like destructuring work as expected
            // meow here will also be a lazy
            // `const { meow } = proxyLazy(() => ({ meow: [] }));`
            if (!isChild && isSameTick) {
                return proxyLazy(
                    () => Reflect.get(target[proxyLazyGet](), p, receiver),
                    attempts,
                    true
                );
            }

            const lazyTarget = target[proxyLazyGet]();
            if (typeof lazyTarget === "object" || typeof lazyTarget === "function") {
                return Reflect.get(lazyTarget, p, receiver);
            }

            throw new Error("proxyLazy called on a primitive value. This can happen if you try to destructure a primitive at the same tick as the proxy was created.");
        }
    });

    return proxy;
}

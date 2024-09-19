/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UNCONFIGURABLE_PROPERTIES } from "./misc";

export const SYM_LAZY_GET = Symbol.for("vencord.lazy.get");
export const SYM_LAZY_CACHED = Symbol.for("vencord.lazy.cached");

export type LazyFunction<T> = (() => T) & {
    $$vencordLazyFailed: () => boolean;
};

export function makeLazy<T>(factory: () => T, attempts = 5, { isIndirect = false }: { isIndirect?: boolean; } = {}): LazyFunction<T> {
    let tries = 0;
    let cache: T;

    const getter: LazyFunction<T> = function () {
        if (!cache && attempts > tries) {
            tries++;
            cache = factory();
            if (!cache && attempts === tries && !isIndirect) {
                console.error(`makeLazy factory failed:\n${factory}`);
            }
        }

        return cache;
    };

    getter.$$vencordLazyFailed = () => tries === attempts;

    return getter;
}

const handler: ProxyHandler<any> = {
    ...Object.fromEntries(Object.getOwnPropertyNames(Reflect).map(propName =>
        [propName, (target: any, ...args: any[]) => Reflect[propName](target[SYM_LAZY_GET](), ...args)]
    )),
    set: (target, p, newValue) => {
        const lazyTarget = target[SYM_LAZY_GET]();
        return Reflect.set(lazyTarget, p, newValue, lazyTarget);
    },
    ownKeys: target => {
        const keys = Reflect.ownKeys(target[SYM_LAZY_GET]());
        for (const key of UNCONFIGURABLE_PROPERTIES) {
            if (!keys.includes(key)) keys.push(key);
        }
        return keys;
    },
    getOwnPropertyDescriptor: (target, p) => {
        if (typeof p === "string" && UNCONFIGURABLE_PROPERTIES.includes(p)) {
            return Reflect.getOwnPropertyDescriptor(target, p);
        }

        const descriptor = Reflect.getOwnPropertyDescriptor(target[SYM_LAZY_GET](), p);
        if (descriptor) Object.defineProperty(target, p, descriptor);
        return descriptor;
    }
};

/**
 * Wraps the result of factory in a Proxy you can consume as if it wasn't lazy.
 * On first property access, the factory is evaluated.
 *
 * IMPORTANT:
 * Destructuring at top level is not supported for proxyLazy.
 *
 * @param factory Factory returning the result
 * @param attempts How many times to try to evaluate the factory before giving up
 * @param err The error message to throw when the factory fails
 * @param primitiveErr The error message to throw when factory result is a primitive
 * @returns Result of factory function
 */
export function proxyLazy<T = any>(factory: () => T, attempts = 5, err: string | (() => string) = `proxyLazy factory failed:\n${factory}`, primitiveErr = "proxyLazy called on a primitive value.", isChild = false): T {
    const get = makeLazy(factory, attempts, { isIndirect: true });

    let isSameTick = true;
    if (!isChild) setTimeout(() => isSameTick = false, 0);

    const proxyDummy = Object.assign(function () { }, {
        [SYM_LAZY_GET]() {
            if (!proxyDummy[SYM_LAZY_CACHED]) {
                if (!get.$$vencordLazyFailed()) {
                    proxyDummy[SYM_LAZY_CACHED] = get();
                }

                if (!proxyDummy[SYM_LAZY_CACHED]) {
                    throw new Error(typeof err === "string" ? err : err());
                } else {
                    if (typeof proxyDummy[SYM_LAZY_CACHED] === "function") {
                        proxy.toString = proxyDummy[SYM_LAZY_CACHED].toString.bind(proxyDummy[SYM_LAZY_CACHED]);
                    }
                }
            }

            return proxyDummy[SYM_LAZY_CACHED];
        },
        [SYM_LAZY_CACHED]: void 0 as T | undefined
    });

    const proxy = new Proxy(proxyDummy, {
        ...handler,
        get(target, p, receiver) {
            if (p === SYM_LAZY_GET || p === SYM_LAZY_CACHED) {
                return Reflect.get(target, p, receiver);
            }

            // If we're still in the same tick, it means the lazy was immediately used.
            // thus, we lazy proxy the get access to make things like destructuring work as expected
            // meow here will also be a lazy
            // `const { meow } = proxyLazy(() => ({ meow: [] }));`
            if (!isChild && isSameTick) {
                console.warn(
                    "Destructuring webpack finds/proxyInner/proxyLazy at top level is deprecated. For more information read https://github.com/Vendicated/Vencord/pull/2409#issue-2277161516" +
                    "\nConsider not destructuring, using findProp or if you really need to destructure, using mapMangledModule instead."
                );

                return proxyLazy(
                    () => {
                        const lazyTarget = target[SYM_LAZY_GET]();
                        return Reflect.get(lazyTarget, p, lazyTarget);
                    },
                    attempts,
                    err,
                    primitiveErr,
                    true
                );
            }

            const lazyTarget = target[SYM_LAZY_GET]();
            if (typeof lazyTarget === "object" || typeof lazyTarget === "function") {
                return Reflect.get(lazyTarget, p, lazyTarget);
            }

            throw new Error(primitiveErr);
        }
    });

    return proxy;
}

/**
 * A string which returns the factory result every time its value is accessed.
 *
 * @param factory Factory returning the string to use as the value
 */
export function lazyString<T extends string>(factory: () => T) {
    const descriptor: PropertyDescriptor = {
        configurable: true,
        enumerable: false,
        writable: false,
        value: factory
    };

    return Object.create(String.prototype, {
        toString: descriptor,
        valueOf: descriptor
    });
}

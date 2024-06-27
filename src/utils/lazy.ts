/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UNCONFIGURABLE_PROPERTIES } from "./misc";
import { AnyObject } from "./types";

export type ProxyLazy<T = AnyObject> = T & {
    [SYM_LAZY_GET]: () => T;
    [SYM_LAZY_CACHED]: T | undefined;
};

export const SYM_LAZY_GET = Symbol.for("vencord.lazy.get");
export const SYM_LAZY_CACHED = Symbol.for("vencord.lazy.cached");

export type LazyFunction<T> = (() => T) & {
    $$vencordLazyFailed: () => boolean;
};

export function makeLazy<T>(factory: () => T, attempts = 5, { isIndirect = false }: { isIndirect?: boolean; } = {}): LazyFunction<T> {
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
 * @returns Result of factory function
 */
export function proxyLazy<T = AnyObject>(factory: () => T, attempts = 5): ProxyLazy<T> {
    const get = makeLazy(factory, attempts, { isIndirect: true });

    const proxyDummy = Object.assign(function () { }, {
        [SYM_LAZY_GET]() {
            if (!proxyDummy[SYM_LAZY_CACHED]) {
                if (!get.$$vencordLazyFailed()) {
                    proxyDummy[SYM_LAZY_CACHED] = get();
                }

                if (!proxyDummy[SYM_LAZY_CACHED]) {
                    throw new Error(`proxyLazy factory failed:\n\n${factory}`);
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

            const lazyTarget = target[SYM_LAZY_GET]();
            if (typeof lazyTarget === "object" || typeof lazyTarget === "function") {
                return Reflect.get(lazyTarget, p, lazyTarget);
            }

            throw new Error("proxyLazy called on a primitive value.");
        }
    });

    return proxy;
}

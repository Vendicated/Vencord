/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function makeLazy<T>(factory: () => T): () => T {
    let cache: T;
    return () => cache ?? (cache = factory());
}

// Proxies demand that these properties be unmodified, so proxyLazy
// will always return the function default for them.
const unconfigurable = ["arguments", "caller", "prototype"];

const handler: ProxyHandler<any> = {};

const kGET = Symbol.for("vencord.lazy.get");
const kCACHE = Symbol.for("vencord.lazy.cached");

for (const method of [
    "apply",
    "construct",
    "defineProperty",
    "deleteProperty",
    "get",
    "getOwnPropertyDescriptor",
    "getPrototypeOf",
    "has",
    "isExtensible",
    "ownKeys",
    "preventExtensions",
    "set",
    "setPrototypeOf"
]) {
    handler[method] =
        (target: any, ...args: any[]) => Reflect[method](target[kGET](), ...args);
}

handler.ownKeys = target => {
    const v = target[kGET]();
    const keys = Reflect.ownKeys(v);
    for (const key of unconfigurable) {
        if (!keys.includes(key)) keys.push(key);
    }
    return keys;
};

handler.getOwnPropertyDescriptor = (target, p) => {
    if (typeof p === "string" && unconfigurable.includes(p))
        return Reflect.getOwnPropertyDescriptor(target, p);

    const descriptor = Reflect.getOwnPropertyDescriptor(target[kGET](), p);

    if (descriptor) Object.defineProperty(target, p, descriptor);
    return descriptor;
};

/**
 * Wraps the result of {@see makeLazy} in a Proxy you can consume as if it wasn't lazy.
 * On first property access, the lazy is evaluated
 * @param factory lazy factory
 * @param attempts how many times to try to evaluate the lazy before giving up
 * @returns Proxy
 *
 * Note that the example below exists already as an api, see {@link findByPropsLazy}
 * @example const mod = proxyLazy(() => findByProps("blah")); console.log(mod.blah);
 */
export function proxyLazy<T>(factory: () => T, attempts = 5): T {
    let tries = 0;
    const proxyDummy = Object.assign(function () { }, {
        [kCACHE]: void 0 as T | undefined,
        [kGET]() {
            if (!proxyDummy[kCACHE] && attempts > tries++) {
                proxyDummy[kCACHE] = factory();
            }
            return proxyDummy[kCACHE];
        }
    });

    return new Proxy(proxyDummy, handler) as any;
}

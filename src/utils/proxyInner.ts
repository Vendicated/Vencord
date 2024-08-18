/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated, Nuckyz and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UNCONFIGURABLE_PROPERTIES } from "./misc";

export const SYM_PROXY_INNER_GET = Symbol.for("vencord.proxyInner.get");
export const SYM_PROXY_INNER_VALUE = Symbol.for("vencord.proxyInner.innerValue");

const handler: ProxyHandler<any> = {
    ...Object.fromEntries(Object.getOwnPropertyNames(Reflect).map(propName =>
        [propName, (target: any, ...args: any[]) => Reflect[propName](target[SYM_PROXY_INNER_GET](), ...args)]
    )),
    set: (target, p, value) => {
        const innerTarget = target[SYM_PROXY_INNER_GET]();
        return Reflect.set(innerTarget, p, value, innerTarget);
    },
    ownKeys: target => {
        const keys = Reflect.ownKeys(target[SYM_PROXY_INNER_GET]());
        for (const key of UNCONFIGURABLE_PROPERTIES) {
            if (!keys.includes(key)) keys.push(key);
        }
        return keys;
    },
    getOwnPropertyDescriptor: (target, p) => {
        if (typeof p === "string" && UNCONFIGURABLE_PROPERTIES.includes(p)) {
            return Reflect.getOwnPropertyDescriptor(target, p);
        }

        const descriptor = Reflect.getOwnPropertyDescriptor(target[SYM_PROXY_INNER_GET](), p);
        if (descriptor) Object.defineProperty(target, p, descriptor);
        return descriptor;
    }
};

/**
 * A proxy which has an inner value that can be set later.
 * When a property is accessed, the proxy looks for the property value in its inner value, and errors if it's not set.
 *
 * IMPORTANT:
 * Destructuring at top level is not supported for proxyInner.
 *
 * @param errMsg The error message to throw when the inner value is not set
 * @param primitiveErrMsg The error message to throw when the inner value is a primitive
 * @returns A proxy which will act like the inner value when accessed
 */
export function proxyInner<T = any>(
    errMsg: string | (() => string) = "Proxy inner value is undefined, setInnerValue was never called.",
    primitiveErrMsg = "proxyInner called on a primitive value. This can happen if you try to destructure a primitive at the same tick as the proxy was created.",
    isChild = false
): [proxy: T, setInnerValue: (innerValue: T) => void] {
    let isSameTick = true;
    if (!isChild) setTimeout(() => isSameTick = false, 0);

    const proxyDummy = Object.assign(function () { }, {
        [SYM_PROXY_INNER_GET]: function () {
            if (proxyDummy[SYM_PROXY_INNER_VALUE] == null) {
                throw new Error(typeof errMsg === "string" ? errMsg : errMsg());
            }

            return proxyDummy[SYM_PROXY_INNER_VALUE];
        },
        [SYM_PROXY_INNER_VALUE]: void 0 as T | undefined
    });

    const proxy = new Proxy(proxyDummy, {
        ...handler,
        get(target, p, receiver) {
            if (p === SYM_PROXY_INNER_GET || p === SYM_PROXY_INNER_VALUE) {
                return Reflect.get(target, p, receiver);
            }

            // If we're still in the same tick, it means the proxy was immediately used.
            // And, if the inner value is still nullish, it means the proxy was used before setInnerValue was called.
            // So, proxy the get access to make things like destructuring work as expected.
            // We dont need to proxy if the inner value is available, and recursiveSetInnerValue won't ever be called anyways,
            // because the top setInnerValue was called before we proxied the get access
            // example here will also be a proxy:
            // `const { example } = findByProps("example");`
            if (isSameTick && !isChild && proxyDummy[SYM_PROXY_INNER_VALUE] == null) {
                console.warn(
                    "Destructuring webpack finds/proxyInner/proxyLazy at top level is deprecated. For more information read https://github.com/Vendicated/Vencord/pull/2409#issue-2277161516" +
                    "\nConsider not destructuring, using findProp or if you really need to destructure, using mapMangledModule instead."
                );

                const [recursiveProxy, recursiveSetInnerValue] = proxyInner(errMsg, primitiveErrMsg, true);

                recursiveSetInnerValues.push((innerValue: T) => {
                    // Set the inner value of the destructured value as the prop value p of the parent
                    recursiveSetInnerValue(Reflect.get(innerValue as object, p, innerValue));
                });

                return recursiveProxy;
            }

            const innerTarget = target[SYM_PROXY_INNER_GET]();
            if (typeof innerTarget === "object" || typeof innerTarget === "function") {
                return Reflect.get(innerTarget, p, innerTarget);
            }

            throw new Error(primitiveErrMsg);
        }
    });

    // Values destructured in the same tick the proxy was created will push their setInnerValue here
    const recursiveSetInnerValues = [] as Array<(innerValue: T) => void>;

    // Once we set the parent inner value, we will call the setInnerValue functions of the destructured values,
    // for them to get the proper value from the parent and use as their inner instead
    function setInnerValue(innerValue: T) {
        proxyDummy[SYM_PROXY_INNER_VALUE] = innerValue;
        recursiveSetInnerValues.forEach(setInnerValue => setInnerValue(innerValue));

        // Avoid binding toString if the inner value is null.
        // This can happen if we are setting the inner value as another instance of proxyInner, which will cause that proxy to instantly evaluate and throw an error
        if (typeof innerValue === "function" && (innerValue[SYM_PROXY_INNER_GET] == null || innerValue[SYM_PROXY_INNER_VALUE] != null)) {
            proxy.toString = innerValue.toString.bind(innerValue);
        }
    }

    return [proxy, setInnerValue];
}

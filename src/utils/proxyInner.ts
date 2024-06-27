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
 * @param err The error message to throw when the inner value is not set
 * @param primitiveErr The error message to throw when the inner value is a primitive
 * @returns A proxy which will act like the inner value when accessed
 */
export function proxyInner<T = any>(
    errMsg = "Proxy inner value is undefined, setInnerValue was never called.",
    primitiveErrMsg = "proxyInner called on a primitive value."
): [proxy: T, setInnerValue: (innerValue: T) => void] {
    const proxyDummy = Object.assign(function () { }, {
        [SYM_PROXY_INNER_GET]: function () {
            if (proxyDummy[SYM_PROXY_INNER_VALUE] == null) {
                throw new Error(errMsg);
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

            const innerTarget = target[SYM_PROXY_INNER_GET]();
            if (typeof innerTarget === "object" || typeof innerTarget === "function") {
                return Reflect.get(innerTarget, p, innerTarget);
            }

            throw new Error(primitiveErrMsg);
        }
    });

    function setInnerValue(innerValue: T) {
        proxyDummy[SYM_PROXY_INNER_VALUE] = innerValue;

        // Avoid binding toString if the inner value is null.
        // This can happen if we are setting the inner value as another instance of proxyInner, which will cause that proxy to instantly evaluate and throw an error
        if (typeof innerValue === "function" && innerValue[SYM_PROXY_INNER_VALUE] == null) {
            proxy.toString = innerValue.toString.bind(innerValue);
        }
    }

    return [proxy, setInnerValue];
}

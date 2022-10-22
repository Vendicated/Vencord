/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { FilterFn, find } from "../webpack";
import { React } from "../webpack/common";
import { proxyLazy } from "./proxyLazy";

/**
 * Makes a lazy function. On first call, the value is computed.
 * On subsequent calls, the same computed value will be returned
 * @param factory Factory function
 */
export function makeLazy<T>(factory: () => T): () => T {
    let cache: T;
    return () => cache ?? (cache = factory());
}
export const lazy = makeLazy;

/**
 * Do a lazy webpack search. Searches the module on first property access
 * @param filter Filter function
 * @returns A proxy to the webpack module. Not all traps are implemented, may produce unexpected results.
 */
export function lazyWebpack<T = any>(filter: FilterFn): T {
    return proxyLazy(() => find(filter));
}

/**
 * Await a promise
 * @param factory Factory
 * @param fallbackValue The fallback value that will be used until the promise resolved
 * @returns [value, error, isPending]
 */
export function useAwaiter<T>(factory: () => Promise<T>): [T | null, any, boolean];
export function useAwaiter<T>(factory: () => Promise<T>, fallbackValue: T): [T, any, boolean];
export function useAwaiter<T>(factory: () => Promise<T>, fallbackValue: null, onError: (e: unknown) => unknown): [T, any, boolean];
export function useAwaiter<T>(factory: () => Promise<T>, fallbackValue: T | null = null, onError?: (e: unknown) => unknown): [T | null, any, boolean] {
    const [state, setState] = React.useState({
        value: fallbackValue,
        error: null,
        pending: true
    });

    React.useEffect(() => {
        let isAlive = true;
        factory()
            .then(value => isAlive && setState({ value, error: null, pending: false }))
            .catch(error => isAlive && (setState({ value: null, error, pending: false }), onError?.(error)));

        return () => void (isAlive = false);
    }, []);

    return [state.value, state.error, state.pending];
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
        return <Component {...props as any /* I hate react typings ??? */} />;
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


/**
 * Join an array of strings in a human readable way (1, 2 and 3)
 * @param elements Elements
 */
export function humanFriendlyJoin(elements: string[]): string;
/**
 * Join an array of strings in a human readable way (1, 2 and 3)
 * @param elements Elements
 * @param mapper Function that converts elements to a string
 */
export function humanFriendlyJoin<T>(elements: T[], mapper: (e: T) => string): string;
export function humanFriendlyJoin(elements: any[], mapper: (e: any) => string = s => s): string {
    const { length } = elements;
    if (length === 0) return "";
    if (length === 1) return mapper(elements[0]);

    let s = "";

    for (let i = 0; i < length; i++) {
        s += mapper(elements[i]);
        if (length - i > 2) s += ", ";
        else if (length - i > 1) s += " and ";
    }

    return s;
}

/**
 * Calls .join(" ") on the arguments
 * classes("one", "two") => "one two"
 */
export function classes(...classes: string[]) {
    return classes.join(" ");
}

export function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * Wraps a Function into a try catch block and logs any errors caught
 * Due to the nature of this function, not all paths return a result.
 * Thus, for consistency, the returned functions will always return void or Promise<void>
 *
 * @param name Name identifying the wrapped function. This will appear in the logged errors
 * @param func Function (async or sync both work)
 * @param thisObject Optional thisObject
 * @returns Wrapped Function
 */
export function suppressErrors<F extends Function>(name: string, func: F, thisObject?: any): F {
    return (func.constructor.name === "AsyncFunction"
        ? async function (this: any) {
            try {
                await func.apply(thisObject ?? this, arguments);
            } catch (e) {
                console.error(`Caught an Error in ${name || "anonymous"}\n`, e);
            }
        }
        : function (this: any) {
            try {
                func.apply(thisObject ?? this, arguments);
            } catch (e) {
                console.error(`Caught an Error in ${name || "anonymous"}\n`, e);
            }
        }) as any as F;
}

/**
 * Wrap the text in ``` with an optional language
 */
export function makeCodeblock(text: string, language?: string) {
    const chars = "```";
    return `${chars}${language || ""}\n${text}\n${chars}`;
}

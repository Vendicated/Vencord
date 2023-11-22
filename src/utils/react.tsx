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

import { FilterFn, filters, find, findByProps } from "@webpack";
import { React, useEffect, useMemo, useReducer, useState } from "@webpack/common";

import { makeLazy } from "./lazy";
import { checkIntersecting } from "./misc";

export const NoopComponent = () => null;

/**
 * Check if an element is on screen
 * @param intersectOnly If `true`, will only update the state when the element comes into view
 * @returns [refCallback, isIntersecting]
 */
export const useIntersection = (intersectOnly = false): [
    refCallback: React.RefCallback<Element>,
    isIntersecting: boolean,
] => {
    const observerRef = React.useRef<IntersectionObserver | null>(null);
    const [isIntersecting, setIntersecting] = useState(false);

    const refCallback = (element: Element | null) => {
        observerRef.current?.disconnect();
        observerRef.current = null;

        if (!element) return;

        if (checkIntersecting(element)) {
            setIntersecting(true);
            if (intersectOnly) return;
        }

        observerRef.current = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.target !== element) continue;
                if (entry.isIntersecting && intersectOnly) {
                    setIntersecting(true);
                    observerRef.current?.disconnect();
                    observerRef.current = null;
                } else {
                    setIntersecting(entry.isIntersecting);
                }
            }
        });
        observerRef.current.observe(element);
    };

    return [refCallback, isIntersecting];
};

type AwaiterRes<T> = [T, any, boolean];
interface AwaiterOpts<T> {
    fallbackValue: T;
    deps?: unknown[];
    onError?(e: any): void;
    onSuccess?(value: T): void;
}
/**
 * Await a promise
 * @param factory Factory
 * @param fallbackValue The fallback value that will be used until the promise resolved
 * @returns [value, error, isPending]
 */
export function useAwaiter<T>(factory: () => Promise<T>): AwaiterRes<T | null>;
export function useAwaiter<T>(factory: () => Promise<T>, providedOpts: AwaiterOpts<T>): AwaiterRes<T>;
export function useAwaiter<T>(factory: () => Promise<T>, providedOpts?: AwaiterOpts<T | null>): AwaiterRes<T | null> {
    const opts: Required<AwaiterOpts<T | null>> = Object.assign({
        fallbackValue: null,
        deps: [],
        onError: null,
    }, providedOpts);
    const [state, setState] = useState({
        value: opts.fallbackValue,
        error: null,
        pending: true
    });

    useEffect(() => {
        let isAlive = true;
        if (!state.pending) setState({ ...state, pending: true });

        factory()
            .then(value => {
                if (!isAlive) return;
                setState({ value, error: null, pending: false });
                opts.onSuccess?.(value);
            })
            .catch(error => {
                if (!isAlive) return;
                setState({ value: null, error, pending: false });
                opts.onError?.(error);
            });

        return () => void (isAlive = false);
    }, opts.deps);

    return [state.value, state.error, state.pending];
}

/**
 * Returns a function that can be used to force rerender react components
 */
export function useForceUpdater(): () => void;
export function useForceUpdater(withDep: true): [unknown, () => void];
export function useForceUpdater(withDep?: true) {
    const r = useReducer(x => x + 1, 0);
    return withDep ? r : r[1];
}

interface TimerOpts {
    interval?: number;
    deps?: unknown[];
}

export function useTimer({ interval = 1000, deps = [] }: TimerOpts) {
    const [time, setTime] = useState(0);
    const start = useMemo(() => Date.now(), deps);

    useEffect(() => {
        const intervalId = setInterval(() => setTime(Date.now() - start), interval);

        return () => {
            setTime(0);
            clearInterval(intervalId);
        };
    }, deps);

    return time;
}

/**
 * Finds the component which includes all the given code. Checks for plain components, memos and forwardRefs
 */
export function findComponentByCode(...code: string[]) {
    const filter = filters.byCode(...code);
    return find(m => {
        if (filter(m)) return true;
        if (!m.$$typeof) return false;
        if (m.type) return filter(m.type); // memos
        if (m.render) return filter(m.render); // forwardRefs
        return false;
    }) ?? NoopComponent;
}

/**
 * Finds the first component that matches the filter, lazily.
 */
export function findComponentLazy<T extends object = any>(filter: FilterFn) {
    return LazyComponent<T>(() => find(filter));
}

/**
 * Finds the first component that includes all the given code, lazily
 */
export function findComponentByCodeLazy<T extends object = any>(...code: string[]) {
    return LazyComponent<T>(() => findComponentByCode(...code));
}

/**
 * Finds the first component that is exported by the first prop name, lazily
 */
export function findExportedComponentLazy<T extends object = any>(...props: string[]) {
    return LazyComponent<T>(() => findByProps(...props)?.[props[0]]);
}

/**
 * A lazy component. The factory method is called on first render.
 * @param factory Function returning a Component
 * @param attempts How many times to try to get the component before giving up
 * @returns Result of factory function
 */
export function LazyComponent<T extends object = any>(factory: () => React.ComponentType<T>, attempts = 5) {
    const get = makeLazy(factory, attempts);
    return (props: T) => {
        const Component = get() ?? NoopComponent;
        return <Component {...props} />;
    };
}

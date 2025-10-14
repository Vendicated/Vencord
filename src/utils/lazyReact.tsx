/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ComponentType } from "react";

import { makeLazy } from "./lazy";

const NoopComponent: ComponentType<any> = () => null;

/**
 * Lazy component wrapper which is JSX-compatible.
 * It is a React ComponentType with an attached helper to retrieve the inner component.
 */
export type LazyComponentWrapper<TProps = any> = ComponentType<TProps> & {
    // allow arbitrary static members (Flex.Justify, Direction, etc.) and index access
    [key: string]: any;
    /** Returns the wrapped component or undefined while unresolved */
    $$vencordGetWrappedComponent(): ComponentType<TProps> | undefined;
    /** Optional preload helper */
    preload?: () => Promise<void> | void;
};

/**
 * A lazy component. The factory method is called on first render.
 * @param factory Function returning a Component
 * @param attempts How many times to try to get the component before giving up
 * @returns A React ComponentType that can be used in JSX
 */
export function LazyComponent<T extends object = any>(factory: () => ComponentType<T>, attempts = 5): LazyComponentWrapper<T> {
    const get = makeLazy(factory, attempts);
    // Use a very permissive type for the runtime wrapper so it can accept any props/static members
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const LazyComponent: any = (props: any) => {
        const Component = get() ?? (NoopComponent as ComponentType<any>);
        return <Component {...props} />;
    };

    // Attach helpers
    LazyComponent.$$vencordGetWrappedComponent = get;

    return LazyComponent as LazyComponentWrapper<T>;
}

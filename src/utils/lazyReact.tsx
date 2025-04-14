/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ComponentType } from "react";

import { makeLazy } from "./lazy";

const NoopComponent = () => null;

export type LazyComponentWrapper<ComponentType> = ComponentType & { $$vencordGetWrappedComponent(): ComponentType; };

/**
 * A lazy component. The factory method is called on first render.
 * @param factory Function returning a Component
 * @param attempts How many times to try to get the component before giving up
 * @returns Result of factory function
 */
export function LazyComponent<T extends object = any>(factory: () => ComponentType<T>, attempts = 5): LazyComponentWrapper<ComponentType<T>> {
    const get = makeLazy(factory, attempts);
    const LazyComponent = (props: T) => {
        const Component = get() ?? NoopComponent;
        return <Component {...props} />;
    };

    LazyComponent.$$vencordGetWrappedComponent = get;

    return LazyComponent;
}

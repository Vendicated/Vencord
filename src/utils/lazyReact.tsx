/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ComponentType } from "react";

import { makeLazy } from "./lazy";

export const NoopComponent = () => null;

/**
 * A lazy component. The factory method is called on first render.
 * @param factory Function returning a component
 * @param attempts How many times to try to get the component before giving up
 * @returns Result of factory function
 */
export function LazyComponent<T extends object = any>(factory: () => React.ComponentType<T>, attempts = 5) {
    const get = makeLazy(factory, attempts);

    const LazyComponent = (props: T) => {
        let Component = (() => {
            console.error(`LazyComponent factory failed:\n\n${factory}`);

            return null;
        }) as React.ComponentType<T>;

        // @ts-ignore
        if (!get.$$vencordLazyFailed()) {
            const result = get();
            if (result != null) Component = result;
        }

        return <Component {...props} />;
    };

    LazyComponent.$$vencordGetter = get;

    return LazyComponent as ComponentType<T>;
}

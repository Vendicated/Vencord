/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeLazy } from "./lazy";

export type LazyComponentType<T extends object = any> = React.ComponentType<T> & Record<PropertyKey, any>;

export const SYM_LAZY_COMPONENT_INNER = Symbol.for("vencord.lazyComponent.inner");

/**
 * A lazy component. The factory method is called on first render.
 *
 * @param factory Function returning a component
 * @param attempts How many times to try to get the component before giving up
 * @returns Result of factory function
 */
export function LazyComponent<T extends object = any>(factory: () => LazyComponentType<T>, attempts = 5, errMsg: string | (() => string) = `LazyComponent factory failed:\n${factory}`) {
    const get = makeLazy(factory, attempts, { isIndirect: true });

    let InnerComponent = null as LazyComponentType<T> | null;

    let lazyFailedLogged = false;
    const LazyComponent = (props: T) => {
        if (!get.$$vencordLazyFailed()) {
            const ResultComponent = get();
            if (ResultComponent != null) {
                InnerComponent = ResultComponent;
                Object.assign(LazyComponent, ResultComponent);
            }
        }

        if (InnerComponent === null && !lazyFailedLogged) {
            if (get.$$vencordLazyFailed()) {
                lazyFailedLogged = true;
            }

            console.error(typeof errMsg === "string" ? errMsg : errMsg());
        }

        return InnerComponent && <InnerComponent {...props} />;
    };

    LazyComponent[SYM_LAZY_COMPONENT_INNER] = () => InnerComponent;

    return LazyComponent as LazyComponentType<T>;
}

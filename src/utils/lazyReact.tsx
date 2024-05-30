/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeLazy } from "./lazy";

/**
 * A lazy component. The factory method is called on first render.
 *
 * @param factory Function returning a component
 * @param attempts How many times to try to get the component before giving up
 * @returns Result of factory function
 */
export function LazyComponent<T extends object = any>(factory: () => React.ComponentType<T>, attempts = 5) {
    const get = makeLazy(factory, attempts, { isIndirect: true });

    let InnerComponent = null as React.ComponentType<T> | null;

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

            console.error(`LazyComponent factory failed:\n\n${factory}`);
        }

        return InnerComponent && <InnerComponent {...props} />;
    };

    return LazyComponent as React.ComponentType<T>;
}

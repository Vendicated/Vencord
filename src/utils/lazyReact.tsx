/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeLazy } from "./lazy";

export const SYM_LAZY_COMPONENT_INNER = Symbol.for("vencord.lazyComponent.inner");

export type LazyComponentType<P extends AnyRecord = AnyRecord> = React.FunctionComponent<P> & AnyRecord & {
    [SYM_LAZY_COMPONENT_INNER]: () => AnyComponentType<P> | null;
};
export type AnyLazyComponentType<P extends AnyRecord = AnyRecord> = LazyComponentType<P & AnyRecord>;

/**
 * A lazy component. The factory method is called on first render.
 *
 * @param factory Function returning a component
 * @param attempts How many times to try to get the component before giving up
 * @returns Result of factory function
 */
export function LazyComponent<P extends AnyRecord>(factory: () => React.ComponentType<P>, attempts = 5, err: string | (() => string) = `LazyComponent factory failed:\n${factory}`): LazyComponentType<P> {
    const get = makeLazy(factory, attempts, { isIndirect: true });

    let InnerComponent = null as AnyComponentType<P> | null;

    let lazyFailedLogged = false;
    const LazyComponent: LazyComponentType<P> = function (props) {
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

            console.error(typeof err === "string" ? err : err());
        }

        return InnerComponent && <InnerComponent {...props} />;
    };

    LazyComponent[SYM_LAZY_COMPONENT_INNER] = () => InnerComponent;

    return LazyComponent;
}

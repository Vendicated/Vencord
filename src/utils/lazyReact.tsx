/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ComponentType } from "react";

import { makeLazy } from "./lazy";

const NoopComponent = () => null;

/**
 * A lazy component. The factory method is called on first render.
 * @param factory Function returning a Component
 * @param attempts How many times to try to get the component before giving up
 * @returns Result of factory function
 */
export function LazyComponent<T extends object = any>(factory: () => React.ComponentType<T>, attempts = 5) {
    const get = makeLazy(factory, attempts);
    const LazyComponent = (props: T) => {
        const Component = get() ?? NoopComponent;
        return <Component {...props} />;
    };

    LazyComponent.$$vencordInternal = get;
    Object.defineProperty(LazyComponent, "name", {
        enumerable: false,
        get() {
            const got = get();
            let name;
            if (Function.prototype.toString.call(got).startsWith("class")) {
                name = got.displayName;
            } else {
                name = got.name;
            }
            return `${name ? `${name}-` : ""}LazyComponent`;
        }
    });
    // Object.defineProperty(LazyComponent, "displayName", {
    //     value: "TEST123DisplayName",
    // });
    return LazyComponent as ComponentType<T>;
}

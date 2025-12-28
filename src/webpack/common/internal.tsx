/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { LazyComponent, LazyComponentWrapper } from "@utils/react";
import { FilterFn, filters, lazyWebpackSearchHistory, waitFor } from "@webpack";
import { ComponentType } from "react";

const logger = new Logger("Webpack");

export function waitForComponent<T extends ComponentType<any> = ComponentType<any> & Record<string, any>>(name: string, filter: FilterFn | string | string[], fallbackValue: ComponentType<any> | null = null) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["waitForComponent", Array.isArray(filter) ? filter : [filter]]);

    let myValue: T | null = null;

    const lazyComponent = LazyComponent(() => {
        if (myValue) return myValue;

        const error = new Error(`Vencord could not find the ${name} Component`);
        logger.error(error);

        if (IS_DEV) throw error;

        return fallbackValue!;
    }) as LazyComponentWrapper<T>;

    waitFor(filter, (v: any) => {
        myValue = v;
        Object.assign(lazyComponent, v);
    }, { isIndirect: true });

    return lazyComponent;
}

export function waitForStore(name: string, cb: (v: any) => void) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["waitForStore", [name]]);

    waitFor(filters.byStoreName(name), cb, { isIndirect: true });
}

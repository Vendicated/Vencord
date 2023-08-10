/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LazyComponent } from "@utils/react";

// eslint-disable-next-line path-alias/no-relative
import { FilterFn, filters, waitFor } from "../webpack";

export function waitForComponent<T extends React.ComponentType<any> = React.ComponentType<any> & Record<string, any>>(name: string, filter: FilterFn | string | string[]): T {
    let myValue: T = function () {
        throw new Error(`Vencord could not find the ${name} Component`);
    } as any;

    const lazyComponent = LazyComponent(() => myValue) as T;
    waitFor(filter, (v: any) => {
        myValue = v;
        Object.assign(lazyComponent, v);
    });

    return lazyComponent;
}

export function waitForStore(name: string, cb: (v: any) => void) {
    waitFor(filters.byStoreName(name), cb);
}

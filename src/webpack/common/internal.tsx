/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { LazyComponent } from "@utils/misc";

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

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

import { LazyComponent } from "@utils/react";

// eslint-disable-next-line path-alias/no-relative
import { FilterFn, filters, lazyWebpackSearchHistory, waitFor } from "../webpack";
const SYM_FORWARD_REF = Symbol.for("react.forward_ref");
const SYM_MEMO = Symbol.for("react.memo");
export function setComponentName(maybeComponent: any, name: string): void {
    try {
        if (
            typeof maybeComponent === "function" &&
            "toString" in maybeComponent &&
            typeof maybeComponent.toString === "function"
        ) {
            const str: string = (() => { }).toString.call(maybeComponent);
            if (typeof str !== "string") void 0;
            else if (str.startsWith("class")) {
                Object.defineProperty(maybeComponent, "displayName", { value: name });
            } else {
                // because typeof v === "function" and v is not a class
                // v must be a function or an arrow function
                Object.defineProperty(maybeComponent, "name", { value: name });
            }
        } else if (
            "$$typeof" in maybeComponent &&
            typeof maybeComponent.$$typeof === "symbol" &&
            (maybeComponent.$$typeof === SYM_FORWARD_REF || maybeComponent.$$typeof === SYM_MEMO)
        ) {
            Object.defineProperty(maybeComponent, "displayName", { value: name });
        } else {
            throw new Error("Unknown component type, not a function, class, memo or a forwardRef");
        }

    } catch (e) {
        (IS_DEV ? console.warn : console.debug)(e, maybeComponent, name);
    }
}
export function waitForComponent<T extends React.ComponentType<any> = React.ComponentType<any> & Record<string, any>>(name: string, filter: FilterFn | string | string[]): T {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["waitForComponent", Array.isArray(filter) ? filter : [filter]]);

    let myValue: T = function () {
        throw new Error(`Vencord could not find the ${name} Component`);
    } as any;
    const lazyComponent = LazyComponent(() => myValue) as T;
    waitFor(filter, (v: any) => {
        myValue = v;
        Object.assign(lazyComponent, v);
        setComponentName(v, name);
    }, { isIndirect: true });

    return lazyComponent;
}

export function waitForStore(name: string, cb: (v: any) => void) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["waitForStore", [name]]);

    waitFor(filters.byStoreName(name), cb, { isIndirect: true });
}

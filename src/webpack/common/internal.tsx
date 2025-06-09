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

import { LazyComponent, LazyComponentWrapper } from "@utils/react";
import { FilterFn, filters, lazyWebpackSearchHistory, waitFor } from "@webpack";

const SYM_FORWARD_REF = Symbol.for("react.forward_ref");
const SYM_MEMO = Symbol.for("react.memo");
/**
 * Wraps a Discord component with its name.
 *
 * @param maybeComponent the component to wrap
 * @param name the name to set for the component
 * @returns maybeComponent
 */
export function wrapDiscordComponentName<T>(maybeComponent: T, name?: string): T {
    if (name && shouldDemangleDiscordComponent()) setComponentName(maybeComponent, name);
    return maybeComponent;
}

/**
 * Wraps a component with its name.
 *
 * @param maybeComponent the component to wrap
 * @param name the name to set for the component
 * @returns maybeComponent
 *
 * @see {@link wrapDiscordComponentName}
 */
export function wrapComponentName<T>(maybeComponent: T, name?: string): T {
    if (name) setComponentName(maybeComponent, name);
    return maybeComponent;
}

export function setComponentName(maybeComponent: any, name: string): void {
    try {
        if (typeof maybeComponent === "function") {
            // classes
            // arrow functions don't have a prototype
            if ("isReactComponent" in (maybeComponent.prototype ?? {}))
                Object.defineProperty(maybeComponent, "displayName", { value: name });
            // functional components, normal and arrow
            else
                Object.defineProperty(maybeComponent, "name", { value: name });
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

export function shouldDemangleDiscordComponent(): boolean {
    return window.Vencord?.Settings?.plugins?.ComponentDemangler?.enabled ?? false;
}

export function waitForComponent<T extends React.ComponentType<any> = React.ComponentType<any> & Record<string, any>>(name: string, filter: FilterFn | string | string[]) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["waitForComponent", Array.isArray(filter) ? filter : [filter]]);

    let myValue: T = function () {
        throw new Error(`Vencord could not find the ${name} Component`);
    } as any;

    const lazyComponent = LazyComponent(() => myValue) as LazyComponentWrapper<T>;
    waitFor(filter, (v: any) => {
        myValue = v;
        Object.assign(lazyComponent, v);
        shouldDemangleDiscordComponent() && setComponentName(v, name);
    }, { isIndirect: true });

    return lazyComponent;
}

export function waitForStore(name: string, cb: (v: any) => void) {
    if (IS_REPORTER) lazyWebpackSearchHistory.push(["waitForStore", [name]]);

    waitFor(filters.byStoreName(name), cb, { isIndirect: true });
}

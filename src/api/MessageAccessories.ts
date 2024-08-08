/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import type { ReactNode } from "react";

export type AccessoryCallback = (props: Record<string, any>) => ReactNode;
export type Accessory = {
    callback: AccessoryCallback;
    position?: number;
};

export const accessories = new Map<string, Accessory>();

export function addAccessory(
    identifier: string,
    callback: AccessoryCallback,
    position?: number
) {
    accessories.set(identifier, {
        callback,
        position,
    });
}

export function removeAccessory(identifier: string) {
    accessories.delete(identifier);
}

export function _modifyAccessories(
    elements: ReactNode[],
    props: Record<string, any>
) {
    for (const accessory of accessories.values()) {
        const accessories = accessory.callback(props);
        // Exclude accessories that won't be rendered
        if (accessories == null || typeof accessories === "boolean")
            continue;

        elements.splice(
            accessory.position != null
                ? accessory.position < 0
                    ? elements.length + accessory.position
                    : accessory.position
                : elements.length,
            0,
            // Don't iterate over strings
            ...typeof accessories === "object" && Symbol.iterator in accessories
                // Exclude accessories that won't be rendered
                ? filterIterable(accessories, a => a != null && typeof a !== "boolean")
                : [accessories]
        );
    }

    return elements;
}

function filterIterable<T, S extends T>(iterable: Iterable<T>, predicate: (value: T) => value is S): Iterable<S>;
function filterIterable<T>(iterable: Iterable<T>, predicate: (value: T) => unknown): Iterable<T>;
function* filterIterable<T>(iterable: Iterable<T>, predicate: (value: T) => unknown) {
    for (const value of iterable)
        if (predicate(value))
            yield value;
}

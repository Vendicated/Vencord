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

import { React,UserStore } from "@webpack/common";
import { User } from "discord-types/general";

export const createDummyUser = (props: Partial<User>) => new (UserStore.getCurrentUser().constructor as any)(props);
export const openURL = (url: string) => VencordNative.native.openExternal(url);
export const validateNumberInput = (value: string) => parseInt(value) ? parseInt(value) : undefined;
export const validateTextInputNumber = (value: string) => /^[0-9\b]+$/.test(value) || value === "";
export const replaceObjectValuesIfExist =
    (target: Object, replace: Object) => Object.entries(target).forEach(([key, value]) => replace[key] && (target[key] = replace[key]));

export type Callback = (child: React.ReactElement) => boolean;

/**
 * Recursively searches for a child component that satisfies the provided callback.
 * @param element - The React element to search within.
 * @param callback - A function that checks if a child component matches the criteria.
 * @returns The matching child component, or undefined if no match is found.
 */
export function findChildren(element: React.ReactNode, callback: Callback): { children?: any, parent?: any; } {
    if (!React.isValidElement(element)) {
        return {};
    }

    if (callback(element)) {
        return { children: element };
    }

    const children = Array.isArray(element.props.children)
        ? element.props.children
        : [element.props.children];

    for (const child of children) {
        const { parent, children: _children } = findChildren(child, callback);

        if (_children) {
            let newParent = parent;
            if (!newParent)
                newParent = element;

            return { children: _children, parent: newParent };
        }
    }

    return {};
}

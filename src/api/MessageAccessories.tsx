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

import ErrorBoundary from "@components/ErrorBoundary";
import { JSX, ReactNode } from "react";

export type MessageAccessoryFactory = (props: Record<string, any>) => ReactNode;
export type MessageAccessory = {
    render: MessageAccessoryFactory;
    position?: number;
};

export const accessories = new Map<string, MessageAccessory>();

export function addMessageAccessory(
    identifier: string,
    render: MessageAccessoryFactory,
    position?: number
) {
    accessories.set(identifier, {
        render,
        position,
    });
}

export function removeMessageAccessory(identifier: string) {
    accessories.delete(identifier);
}

export function _modifyAccessories(
    elements: JSX.Element[],
    props: Record<string, any>
) {
    for (const [key, accessory] of accessories.entries()) {
        const res = (
            <ErrorBoundary noop message={`Failed to render ${key} Message Accessory`} key={key}>
                <accessory.render {...props} />
            </ErrorBoundary>
        );

        elements.splice(
            accessory.position != null
                ? accessory.position < 0
                    ? elements.length + accessory.position
                    : accessory.position
                : elements.length,
            0,
            res
        );
    }

    return elements;
}

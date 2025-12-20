/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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

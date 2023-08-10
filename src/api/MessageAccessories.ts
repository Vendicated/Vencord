/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type AccessoryCallback = (props: Record<string, any>) => JSX.Element | null | Array<JSX.Element | null>;
export type Accessory = {
    callback: AccessoryCallback;
    position?: number;
};

export const accessories = new Map<String, Accessory>();

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
    elements: JSX.Element[],
    props: Record<string, any>
) {
    for (const accessory of accessories.values()) {
        let accessories = accessory.callback(props);
        if (accessories == null)
            continue;

        if (!Array.isArray(accessories))
            accessories = [accessories];
        else if (accessories.length === 0)
            continue;

        elements.splice(
            accessory.position != null
                ? accessory.position < 0
                    ? elements.length + accessory.position
                    : accessory.position
                : elements.length,
            0,
            ...accessories.filter(e => e != null) as JSX.Element[]
        );
    }

    return elements;
}

export type AccessoryCallback = (props: Record<string, any>) => JSX.Element;
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
        elements.splice(
            accessory.position != null
                ? accessory.position < 0
                    ? elements.length + accessory.position
                    : accessory.position
                : elements.length,
            0,
            accessory.callback(props)
        );
    }

    return elements;
}

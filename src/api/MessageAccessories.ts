export type AccessoryCallback = (props: object) => JSX.Element;
export type Accessory = {
    callback: AccessoryCallback;
    position: number | null | undefined;
};

export const accessories = new Map<String, Accessory>();

export function addAccessory(
    identifier: string,
    callback: AccessoryCallback,
    position: number | null | undefined
) {
    accessories.set(identifier, {
        callback,
        position,
    });
}

export function removeAccessory(identifier: string) {
    accessories.delete(identifier);
}

export function _modifyAccessories(elements: JSX.Element[], props: object) {
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

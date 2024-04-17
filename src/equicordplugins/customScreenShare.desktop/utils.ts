/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

let isOnCooldown = false;
let nextFunction: Function | undefined = undefined;

export function cooldown(func: Function | undefined) {
    if (isOnCooldown) {
        nextFunction = func;
        return;
    }
    isOnCooldown = true;
    nextFunction = undefined;

    if (func && typeof func === "function")
        func();

    setTimeout(() => {
        isOnCooldown = false;
        if (nextFunction)
            cooldown(nextFunction);
    }, 1000);
}

export function normalize(value: number, minValue: number, maxValue: any): number | undefined {
    return (value - minValue) / (maxValue - minValue) * 100;
}

export function denormalize(number: number, minValue: number, maxValue: any) {
    return number * (maxValue - minValue) / 100 + minValue;
}

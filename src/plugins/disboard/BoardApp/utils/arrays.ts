/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const moveIndex = <T>(array: Array<T>, itemIndex: number, toIndex: number): Array<T> => {
    // stackoverflow idk man
    while (itemIndex > toIndex) {
        [array[itemIndex], array[itemIndex-1]] = [array[itemIndex-1], array[itemIndex]];
        itemIndex--;
    }
    return array;
};

export default moveIndex;

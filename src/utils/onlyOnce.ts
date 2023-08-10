/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function onlyOnce<F extends Function>(f: F): F {
    let called = false;
    let result: any;
    return function onlyOnceWrapper(this: unknown) {
        if (called) return result;

        called = true;

        return (result = f.apply(this, arguments));
    } as unknown as F;
}

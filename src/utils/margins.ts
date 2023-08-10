/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

let styleStr = "";

export const Margins: Record<`${"top" | "bottom" | "left" | "right"}${8 | 16 | 20}`, string> = {} as any;

for (const dir of ["top", "bottom", "left", "right"] as const) {
    for (const size of [8, 16, 20] as const) {
        const cl = `vc-m-${dir}-${size}`;
        Margins[`${dir}${size}`] = cl;
        styleStr += `.${cl}{margin-${dir}:${size}px;}`;
    }
}

document.addEventListener("DOMContentLoaded", () =>
    document.head.append(Object.assign(document.createElement("style"), {
        textContent: styleStr,
        id: "vencord-margins"
    })), { once: true });

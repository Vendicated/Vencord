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

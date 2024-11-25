/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * @param minContrast -- the min contrast to convert fgColor to
 * @returns a css-valid string that is the repersenting color
*/
export function getContrastingColor(minContrast: number, fgColor: string, bgColor: string): string {
    return "";
}/**
    * @param color -- hex code with #
    */
export function lumin(color: string) {
    const c: [number, number, number] = [0, 0, 0];
    if (color.length === 4) {
        c[0] = parseInt(color[1], 16);
        c[1] = parseInt(color[2], 16);
        c[2] = parseInt(color[3], 16);
    } else if (color.length === 7) {
        c[0] = parseInt(color.substring(1, 3), 16);
        c[1] = parseInt(color.substring(3, 5), 16);
        c[2] = parseInt(color.substring(5, 7), 16);
    } else {
        throw new Error("invalid color");
    }
    c.map(x => x / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);

    return (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2]);
}
// https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-procedure
/**
    * @param color1 -- hex code, with #
    * @param color2 -- hex code, with #
    */
function calculateContrast(color1: string, color2: string) {
    return (lumin(color1) + 0.05) / (lumin(color2) + 0.05);
}


/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// https://css-tricks.com/converting-color-spaces-in-javascript/
export function hexToHSL(hexCode: string) {
    // Hex => RGB normalized to 0-1
    const r = parseInt(hexCode.substring(0, 2), 16) / 255;
    const g = parseInt(hexCode.substring(2, 4), 16) / 255;
    const b = parseInt(hexCode.substring(4, 6), 16) / 255;

    // RGB => HSL
    const cMax = Math.max(r, g, b);
    const cMin = Math.min(r, g, b);
    const delta = cMax - cMin;

    let hue: number;
    let saturation: number;
    let lightness: number;

    lightness = (cMax + cMin) / 2;

    if (delta === 0) {
        // If r=g=b then the only thing that matters is lightness
        hue = 0;
        saturation = 0;
    } else {
        // Magic
        saturation = delta / (1 - Math.abs(2 * lightness - 1));

        if (cMax === r) {
            hue = ((g - b) / delta) % 6;
        } else if (cMax === g) {
            hue = (b - r) / delta + 2;
        } else {
            hue = (r - g) / delta + 4;
        }

        hue *= 60;
        if (hue < 0) {
            hue += 360;
        }
    }

    // Move saturation and lightness from 0-1 to 0-100
    saturation *= 100;
    lightness *= 100;

    return { hue, saturation, lightness };
}

// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
export function relativeLuminance(hexCode: string) {
    const normalize = (x: number) => (
        x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
    );

    const r = normalize(parseInt(hexCode.substring(0, 2), 16) / 255);
    const g = normalize(parseInt(hexCode.substring(2, 4), 16) / 255);
    const b = normalize(parseInt(hexCode.substring(4, 6), 16) / 255);

    return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

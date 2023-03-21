/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { ColorStyle } from "../settings";
import type { RgbPalette } from "./image";
import { sortBy } from "./misc";

export const rgb2hex = (rgb: number[]) => "#" + rgb.map(c => c.toString(16).padStart(2, "0")).join("");

/** https://stackoverflow.com/a/54070620/6719456 */
export const rgb2hsv = ([r, g, b]: number[]) => {
    const v = Math.max(r, g, b), c = v - Math.min(r, g, b);
    const h = c && ((v === r) ? (g - b) / c : ((v === g) ? 2 + (b - r) / c : 4 + (r - g) / c));
    return [60 * (h < 0 ? h + 6 : h), v && c / v, v / 0xFF];
};

/** https://stackoverflow.com/a/54024653/6719456 */
export const hsv2rgb = ([h, s, v]: number[]) => {
    const f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return [f(5) * 0xFF, f(3) * 0xFF, f(1) * 0xFF];
};

/** Whether a given color is light or dark */
export const getRgbContrast = ([r, g, b]: number[]) => {
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? "light" : "dark";
};

enum Test {
    a = "abc",
    d = "def"
}

export const hslTargets = {
    vibrant: [NaN, 1, 1],
    pastel: [NaN, 0.3, 1],
    muted: [NaN, 0.25, 0.3],
    discord: [NaN, NaN, NaN],
} satisfies { [K in ColorStyle]: number[] };

export function pickColor(style: ColorStyle, palette: RgbPalette) {
    const hsvPalette = palette.map(rgb2hsv);
    const target = hslTargets[style];
    hsvPalette.sort(sortBy(
        color => target
            .map((_, i) => (color[i] - target[i]) ** 2)
            .filter(dist => !isNaN(dist))
            .reduce((a, b) => a + b),
    ));
    return hsvPalette[0];
}

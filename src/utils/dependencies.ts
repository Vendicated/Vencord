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

import { makeLazy } from "./misc";

/*
    Add dynamically loaded dependencies for plugins here.
 */

// https://github.com/mattdesl/gifenc
// this lib is way better than gif.js and all other libs, they're all so terrible but this one is nice
// @ts-ignore ts mad
export const getGifEncoder = makeLazy(() => import("https://unpkg.com/gifenc@1.0.3/dist/gifenc.esm.js"));

// needed to parse APNGs in the nitroBypass plugin
export const importApngJs = makeLazy(async () => {
    const exports = {};
    const winProxy = new Proxy(window, { set: (_, k, v) => exports[k] = v });
    Function("self", await fetch("https://cdnjs.cloudflare.com/ajax/libs/apng-canvas/2.1.1/apng-canvas.min.js").then(r => r.text()))(winProxy);
    // @ts-ignore
    return exports.APNG as { parseURL(url: string): Promise<FrameData> };
});

interface Frame {
    left: number;
    top: number;
    width: number;
    height: number;
    img: HTMLImageElement;
    delay: number;
}

interface FrameData {
    width: number;
    height: number;
    frames: Frame[];
    playTime: number;
}

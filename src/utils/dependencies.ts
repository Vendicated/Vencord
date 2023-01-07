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
    return exports.APNG as { parseURL(url: string): Promise<ApngFrameData>; };
});

// https://wiki.mozilla.org/APNG_Specification#.60fcTL.60:_The_Frame_Control_Chunk
export enum ApngDisposeOp {
    /**
     * no disposal is done on this frame before rendering the next; the contents of the output buffer are left as is.
     */
    NONE,
    /**
     * the frame's region of the output buffer is to be cleared to fully transparent black before rendering the next frame.
     */
    BACKGROUND,
    /**
     * the frame's region of the output buffer is to be reverted to the previous contents before rendering the next frame.
     */
    PREVIOUS
}

// TODO: Might need to somehow implement this
export enum ApngBlendOp {
    SOURCE,
    OVER
}
export interface ApngFrame {
    left: number;
    top: number;
    width: number;
    height: number;
    img: HTMLImageElement;
    delay: number;
    blendOp: ApngBlendOp;
    disposeOp: ApngDisposeOp;
}

export interface ApngFrameData {
    width: number;
    height: number;
    frames: ApngFrame[];
    playTime: number;
}

const shikiWorkerDist = "https://unpkg.com/@vap/shiki-worker@0.0.8/dist";
export const shikiWorkerSrc = `${shikiWorkerDist}/${IS_DEV ? "index.js" : "index.min.js"}`;
export const shikiOnigasmSrc = "https://unpkg.com/@vap/shiki@0.10.3/dist/onig.wasm";

// @ts-expect-error SHUT UP
export const getStegCloak = makeLazy(() => import("https://unpkg.com/stegcloak-dist@1.0.0/index.js"));

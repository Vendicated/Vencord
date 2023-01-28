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

import { getGifEncoder } from "@utils/dependencies";

import { Resource, ResourceImage } from "../types";

const DEFAULT_PALETTE: RgbPalette = [[0, 0, 0]];

export type RgbPalette = number[][];

export async function getPaletteFromUrl(url: string, imgSize: number, paletteSize: number): Promise<RgbPalette> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return DEFAULT_PALETTE;

    const image = await getLoadedImageFromUrl(url);
    canvas.width = image.width = imgSize;
    canvas.height = image.height = imgSize;
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    const gifenc = await getGifEncoder();
    return gifenc.quantize(imageData.data, paletteSize);
}

export function getLoadedImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = error => reject(error);
        image.src = url;
    });
}

export async function getDataUrlFromUrl(url: string) {
    const blob = await fetch(url).then(r => r.blob());
    const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
    return base64;
}

export function getSmallestImage(resource: Resource) {
    let images: ResourceImage[] | null = null;
    if ("images" in resource) images = resource.images.slice();
    else if (resource.type === "track") images = resource.album.images.slice();

    if (!images) return null;

    images.sort((a, b) => a.width - b.width);
    return images[0];
}

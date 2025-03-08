/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { brushCanvas } from "../components/Canvas";

export function fillCircle(x: number, y: number, radius: number, canvas = brushCanvas) {
    canvas.beginPath();
    canvas.arc(x, y, radius, 0, Math.PI * 2);
    canvas.fill();
}

export function strokeCircle(x: number, y: number, radius: number, canvas = brushCanvas) {
    canvas.beginPath();
    canvas.arc(x, y, radius, 0, Math.PI * 2);
    canvas.stroke();
}

export function line(x1: number, y1: number, x2: number, y2: number, canvas = brushCanvas) {
    canvas.beginPath();
    canvas.moveTo(x1, y1);
    canvas.lineTo(x2, y2);
    canvas.stroke();
}

export function dist(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function widthFromBounds(bounds: { left: number, right: number, top: number, bottom: number; }) {
    return bounds.right - bounds.left;
}

export function heightFromBounds(bounds: { left: number, right: number, top: number, bottom: number; }) {
    return bounds.bottom - bounds.top;
}

export async function urlToImage(url: string) {
    return new Promise<HTMLImageElement>(resolve => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.src = url;
    });
}

export function imageToBlob(image: HTMLImageElement) {
    return new Promise<File>(resolve => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        canvas.toBlob(blob => {
            if (!blob) return;

            resolve(new File([blob], "image.png", { type: "image/png" }));
        });
    });
}

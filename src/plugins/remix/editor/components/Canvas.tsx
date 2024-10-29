/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useRef } from "@webpack/common";

import { initInput } from "../input";
import { bounds } from "../tools/crop";
import { heightFromBounds, widthFromBounds } from "../utils/canvas";

export let canvas: HTMLCanvasElement | null = null;
export let ctx: CanvasRenderingContext2D | null = null;

export const brushCanvas = document.createElement("canvas")!.getContext("2d")!;
export const shapeCanvas = document.createElement("canvas")!.getContext("2d")!;
export const cropCanvas = document.createElement("canvas")!.getContext("2d")!;

export let image: HTMLImageElement;

export function exportImg(): Promise<Blob> {
    return new Promise<Blob>(resolve => {
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        ctx.drawImage(brushCanvas.canvas, 0, 0);

        if (bounds.right === -1) bounds.right = canvas.width;
        if (bounds.bottom === -1) bounds.bottom = canvas.height;

        const renderCanvas = document.createElement("canvas");
        renderCanvas.width = widthFromBounds(bounds);
        renderCanvas.height = heightFromBounds(bounds);

        const renderCtx = renderCanvas.getContext("2d")!;
        renderCtx.drawImage(canvas, -bounds.left, -bounds.top);
        renderCanvas.toBlob(blob => resolve(blob!));

        render();
    });
}

export const Canvas = ({ file }: { file: File; }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        image = new Image();
        image.src = URL.createObjectURL(file);
        image.onload = () => {
            canvas = canvasRef.current;

            if (!canvas) return;

            canvas.width = image.width;
            canvas.height = image.height;
            brushCanvas.canvas.width = image.width;
            brushCanvas.canvas.height = image.height;
            shapeCanvas.canvas.width = image.width;
            shapeCanvas.canvas.height = image.height;
            cropCanvas.canvas.width = image.width;
            cropCanvas.canvas.height = image.height;

            ctx = canvas.getContext("2d")!;
            ctx.drawImage(image, 0, 0);

            initInput();
        };
    });

    return (<canvas ref={canvasRef} className="vc-remix-canvas"></canvas>);
};

export function render() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    ctx.drawImage(brushCanvas.canvas, 0, 0);
    ctx.drawImage(shapeCanvas.canvas, 0, 0);
    ctx.drawImage(cropCanvas.canvas, 0, 0);
}

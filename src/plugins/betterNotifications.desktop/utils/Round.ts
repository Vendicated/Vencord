/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export async function cropImageToCircle(src, size) {
    const { promise: imgLoaded, resolve } = Promise.withResolvers();

    src = src.startsWith("/assets")
        ? `https://discord.com${src}`
        : src;

    const img = new Image();
    img.onload = resolve;
    img.crossOrigin = "anonymous";
    img.src = src;

    await imgLoaded;

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.clip();

    ctx.drawImage(img, 0, 0, size, size);

    return canvas.toDataURL();
}

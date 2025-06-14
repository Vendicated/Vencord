/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export enum AttachmentManipulation {
    cropTop,
    cropCenter,
    cropBottom,
    fillBlank,
    none
}

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

export async function fitAttachmentIntoCorrectAspectRatio(src, type: AttachmentManipulation) {
    const { promise: imgLoaded, resolve } = Promise.withResolvers();

    const img = new Image();
    img.onload = resolve;
    img.crossOrigin = "anonymous";
    img.src = src;

    await imgLoaded;

    const canvas = document.createElement("canvas");

    canvas.width = 1092; // aspect ratio for windows 'hero' images
    canvas.height = 540;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context not defined");


    const ratio = img.width / img.height;
    const width = canvas.height * ratio;
    const height = canvas.width / ratio;

    switch (type) {
        case AttachmentManipulation.cropTop:
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, height);
            break;
        case AttachmentManipulation.cropCenter:
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, -(height / 2) + canvas.height / 2, canvas.width, height);
            break;
        case AttachmentManipulation.cropBottom:
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, -height + canvas.height, canvas.width, height);
            break;
        case AttachmentManipulation.fillBlank:
            const offset = img.width / 10;
            ctx.save();
            ctx.filter = "blur(20px)";
            ctx.drawImage(img, offset / 4, offset, img.width, img.height, 0, 0, canvas.width + offset * 2, height + offset * 2);
            ctx.restore();
            if (ratio > (canvas.width / canvas.height)) {
                ctx.drawImage(img, 0, 0, img.width, img.height, 0, canvas.height / 2 - height / 2, canvas.width, height);
            } else {
                ctx.drawImage(img, 0, 0, img.width, img.height, (canvas.width / 2) - width / 2, 0, width, canvas.height);
            }
    }

    return canvas.toDataURL();
}


export async function blurImage(src, amount = 34) {
    // 34px blur seems to be equavilent to discord's spoiler blur
    const { promise: imgLoaded, resolve } = Promise.withResolvers();

    const img = new Image();
    img.onload = resolve;
    img.crossOrigin = "anonymous";
    img.src = src;

    await imgLoaded;

    const canvas = document.createElement("canvas");

    canvas.width = img.width; // aspect ratio for windows 'hero' images
    canvas.height = img.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context not defined");

    ctx.filter = ` blur(${amount}px)`;
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL();
}

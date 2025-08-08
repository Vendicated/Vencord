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


interface Rect {
    x: number,
    y: number,
    height: number,
    width: number;
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

function imgInit(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = err => reject(err);

        img.crossOrigin = "anonymous";

        img.src = src;
    });
}

function drawImageRect(ctx: CanvasRenderingContext2D, img: HTMLImageElement, rect: Rect) {
    const imgRatio = img.width / img.height;
    const rectRatio = rect.width / rect.height;
    let dw, dh, dx, dy;

    if (imgRatio > rectRatio) {
        dw = rect.width;
        dh = dw / imgRatio;
        dx = rect.x;
        dy = rect.y + (rect.height - dh) / 2;
    } else {
        dh = rect.height;
        dw = dh * imgRatio;
        dy = rect.y;
        dx = rect.x + (rect.width - dw) / 2;
    }
    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
}

export async function fitAttachmentIntoCorrectAspectRatio(images: string[], type: AttachmentManipulation) {
    const { promise: imgLoaded, resolve } = Promise.withResolvers();

    const imageElements = await Promise.all(images.map(imgInit));
    const img = imageElements[0];

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
            ctx.save();
            ctx.filter = "blur(20px)";

            const imgRatio = img.width / img.height;
            const canvasRatio = canvas.width / canvas.height;
            let bgWidth, bgHeight, bgX, bgY;

            if (imgRatio > canvasRatio) {
                bgHeight = canvas.height;
                bgWidth = bgHeight * imgRatio;
                bgX = (canvas.width - bgWidth) / 2;
                bgY = 0;
            } else {
                bgWidth = canvas.width;
                bgHeight = bgWidth / imgRatio;
                bgY = (canvas.height - bgHeight) / 2;
                bgX = 0;
            }
            ctx.drawImage(img, bgX, bgY, bgWidth, bgHeight);
            ctx.restore();


            switch (imageElements.length) {
                case 1:
                    if (ratio > (canvas.width / canvas.height)) {
                        ctx.drawImage(img, 0, 0, img.width, img.height, 0, canvas.height / 2 - height / 2, canvas.width, height);
                    } else {
                        ctx.drawImage(img, 0, 0, img.width, img.height, (canvas.width / 2) - width / 2, 0, width, canvas.height);
                    }
                    break;

                case 2:
                    for (let i = 0; i < imageElements.length; i++) {
                        const img = imageElements[i];

                        if (i === 0) {
                            ctx.drawImage(img, (img.width - canvas.width / 2) / 2, (img.height - canvas.height) / 2, canvas.width / 2, canvas.height, 0, 0, canvas.width / 2, canvas.height);
                        } else if (i === 1) {
                            ctx.drawImage(img, (img.width - canvas.width / 2) / 2, (img.height - canvas.height) / 2, canvas.width / 2, canvas.height, canvas.width / 2, 0, canvas.width / 2, canvas.height);
                        }
                    }
                    break;

                case 3:
                    for (let i = 0; i < imageElements.length; i++) {
                        const img = imageElements[i];
                        const margin = 8;

                        if (i === 0) {
                            ctx.drawImage(img, (img.width - canvas.width / 2) / 2, (img.height - canvas.height) / 2, canvas.width / 2, canvas.height, 0, 0, canvas.width / 2, canvas.height);
                        } else if (i === 1) {
                            ctx.drawImage(img, (img.width - canvas.width / 2) / 2, (img.height - canvas.height / 2) / 2, canvas.width / 2, canvas.height / 2, canvas.width / 2 + margin, 0, canvas.width / 2 - margin, canvas.height / 2 - margin / 2);
                        } else if (i === 2) {
                            ctx.drawImage(img, (img.width - canvas.width / 2) / 2, (img.height - canvas.height / 2) / 2, canvas.width / 2, canvas.height / 2, canvas.width / 2 + margin, canvas.height / 2 + margin, canvas.width / 2 - margin, canvas.height / 2 - margin);
                        }
                    }
                    break;

            }

    }

    return canvas.toDataURL();
}


export async function blurImage(src, amount = 84) {
    // 84px blur seems to be equavilent to discord's spoiler blur
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

    ctx.filter = ` blur(${amount}px)`;
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL();
}

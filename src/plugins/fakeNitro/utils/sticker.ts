/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApngBlendOp, ApngDisposeOp, importApngJs } from "@utils/dependencies";
import { ChannelStore, DraftType,UploadHandler } from "@webpack/common";
import { applyPalette, GIFEncoder, quantize } from "gifenc";

import { settings } from "../settings";

export function getStickerLink(stickerId: string) {
    return `https://media.discordapp.net/stickers/${stickerId}.png?size=${settings.store.stickerSize}`;
}

export async function sendAnimatedSticker(stickerLink: string, stickerId: string, channelId: string) {
    const { parseURL } = importApngJs();

    const { frames, width, height } = await parseURL(stickerLink);

    const gif = GIFEncoder();
    const resolution = settings.store.stickerSize;

    const canvas = document.createElement("canvas");
    canvas.width = resolution;
    canvas.height = resolution;

    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    })!;

    const scale = resolution / Math.max(width, height);
    ctx.scale(scale, scale);

    let previousFrameData: ImageData;

    for (const frame of frames) {
        const { left, top, width, height, img, delay, blendOp, disposeOp } = frame;

        previousFrameData = ctx.getImageData(left, top, width, height);

        if (blendOp === ApngBlendOp.SOURCE) {
            ctx.clearRect(left, top, width, height);
        }

        ctx.drawImage(img, left, top, width, height);

        const { data } = ctx.getImageData(0, 0, resolution, resolution);

        const palette = quantize(data, 256);
        const index = applyPalette(data, palette);

        gif.writeFrame(index, resolution, resolution, {
            transparent: true,
            palette,
            delay
        });

        if (disposeOp === ApngDisposeOp.BACKGROUND) {
            ctx.clearRect(left, top, width, height);
        } else if (disposeOp === ApngDisposeOp.PREVIOUS) {
            ctx.putImageData(previousFrameData, left, top);
        }
    }

    gif.finish();

    const file = new File([gif.bytesView()], `${stickerId}.gif`, { type: "image/gif" });
    UploadHandler.promptToUpload([file], ChannelStore.getChannel(channelId), DraftType.ChannelMessage);
}

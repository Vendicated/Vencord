/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getMimeFromExtension } from "@equicordplugins/fileUpload/utils/getMediaUrl";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { insertTextIntoChatInputBox, MessageOptions } from "@utils/discord";
import { CloudUploadPlatform } from "@vencord/discord-types/enums";
import { ChannelStore, CloudUploader, Constants, DraftStore, FluxDispatcher, MessageActions, PendingReplyStore, RestAPI, showToast, SnowflakeUtils, UploadHandler } from "@webpack/common";

import { settings } from ".";
import { FFmpegState, Sticker } from "./types";
import { nativeFetch } from "./utils";

type SendStickerOptions = {
    channelId: string;
    sticker: Sticker;
    ctrlKey: boolean;
    shiftKey: boolean;
    ffmpegState?: FFmpegState;
};

export const ffmpeg = new FFmpeg();

async function resizeImage(url: string) {
    const originalImage = new Image();
    originalImage.crossOrigin = "anonymous"; // If the image is hosted on a different domain, enable CORS

    const loadImage = new Promise((resolve, reject) => {
        originalImage.onload = resolve;
        originalImage.onerror = reject;
        originalImage.src = url;
    });

    await loadImage;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Determine the target size of the processed image (160x160)
    const targetSize = 160;

    // Calculate the scale factor to resize the image
    const scaleFactor = Math.min(targetSize / originalImage.width, targetSize / originalImage.height);

    // Calculate the dimensions for resizing the image while maintaining aspect ratio
    const resizedWidth = originalImage.width * scaleFactor;
    const resizedHeight = originalImage.height * scaleFactor;

    // Set the canvas size to the target dimensions
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Draw the resized image onto the canvas
    ctx.drawImage(originalImage, 0, 0, resizedWidth, resizedHeight);

    // Get the canvas image data
    const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
    const { data } = imageData;

    // Apply any additional image processing or filters here if desired

    // Convert the image data to a Blob
    const blob: Blob | null = await new Promise(resolve => {
        canvas.toBlob(resolve, "image/png");
    });
    if (!blob) throw new Error("Could not convert canvas to blob");

    // return the object URL representing the Blob
    return blob;
}

async function toGIF(url: string, ffmpeg: FFmpeg): Promise<File> {
    const filename = (new URL(url)).pathname.split("/").pop() ?? "image.png";
    const res = await nativeFetch(url);
    if (!res.ok) throw new Error("Failed to fetch image for GIF conversion");
    const arr = new Uint8Array(await res.arrayBuffer());
    await ffmpeg.writeFile(filename, arr);

    const outputFilename = "output.gif";
    await ffmpeg.exec(["-i", filename,
        "-filter_complex", `split[s0][s1];
        [s0]palettegen=
          stats_mode=single:
          transparency_color=000000[p];
        [s1][p]paletteuse=
          new=1:
          alpha_threshold=10`,
        outputFilename]);

    const data = await ffmpeg.readFile(outputFilename);
    await ffmpeg.deleteFile(filename);
    await ffmpeg.deleteFile(outputFilename);
    if (typeof data === "string") {
        throw new Error("Could not read file");
    }

    const uint8 = new Uint8Array(data.length);
    uint8.set(data);

    return new File([uint8], outputFilename, {
        type: "image/gif",
    });
}

export async function sendSticker({ channelId, sticker, ctrlKey, shiftKey, ffmpegState }: SendStickerOptions) {
    const reply = PendingReplyStore.getPendingReply(channelId);
    let content = DraftStore.getDraft(channelId, 0);
    let options: Partial<MessageOptions> = {};
    let file: File;

    if (reply) {
        FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
        options = MessageActions.getSendMessageOptionsForReply(reply);
    }

    if (shiftKey) {
        if (!content.endsWith(" ") && !content.endsWith("\n")) content = " ";
        content += sticker.image;

        return ctrlKey
            ? insertTextIntoChatInputBox(content)
            : MessageActions._sendMessage(channelId, { content: sticker.image }, options);
    }

    if (sticker?.isAnimated) {
        if (!ffmpegState?.ffmpeg || !ffmpegState.isLoaded) throw new Error("FFmpeg not ready");
        file = await toGIF(sticker.image, ffmpegState.ffmpeg);
    } else {
        const res = await nativeFetch(sticker.image);
        if (!res.ok) throw new Error("Failed to fetch sticker image");
        const blobUrl = URL.createObjectURL(await res.blob());
        let processed: Blob;
        try {
            processed = await resizeImage(blobUrl);
        } finally {
            URL.revokeObjectURL(blobUrl);
        }
        const filename = sticker.filename ?? new URL(sticker.image).pathname.split("/").pop()!;
        const mimeType = getMimeFromExtension(filename.split(".").pop());

        file = new File([processed], filename, { type: mimeType });
    }

    if (settings.store.promptToUpload || content) return UploadHandler.promptToUpload([file], ChannelStore.getChannel(channelId), 0);

    const upload = new CloudUploader({ file, platform: CloudUploadPlatform.WEB }, channelId);

    upload.on("complete", () => {
        RestAPI.post({
            url: Constants.Endpoints.MESSAGES(channelId),
            body: {
                flags: 0,
                channel_id: channelId,
                content: "",
                nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                sticker_ids: [],
                type: 0,
                attachments: [{
                    id: "0",
                    filename: upload.filename,
                    uploaded_filename: upload.uploadedFilename,
                }],
                message_reference: reply ? options?.messageReference : null,
            }
        });
    });

    upload.on("error", () => showToast({ text: "Failed to upload sticker", variant: "critical" }));

    upload.upload();
}

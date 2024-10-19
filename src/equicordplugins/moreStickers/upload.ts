/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { findByPropsLazy, findLazy } from "@webpack";
import { ChannelStore } from "@webpack/common";

import { FFmpegState, Sticker } from "./types";


const MessageUpload = findByPropsLazy("instantBatchUpload");
const CloudUpload = findLazy(m => m.prototype?.trackUploadFinished);
const PendingReplyStore = findByPropsLazy("getPendingReply");
const MessageUtils = findByPropsLazy("sendMessage");
const DraftStore = findByPropsLazy("getDraft", "getState");
const promptToUploadParent = findByPropsLazy("promptToUpload");


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
    await ffmpeg.writeFile(filename, await fetchFile(url));

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
    return new File([data.buffer], outputFilename, { type: "image/gif" });
}

export async function sendSticker({
    channelId,
    sticker,
    sendAsLink,
    ctrlKey,
    shiftKey,
    ffmpegState
}: { channelId: string; sticker: Sticker; sendAsLink?: boolean; ctrlKey: boolean; shiftKey: boolean; ffmpegState?: FFmpegState; }) {

    let messageContent = "";
    const { textEditor } = Vencord.Plugins.plugins.MoreStickers as any;
    if (DraftStore) {
        messageContent = DraftStore.getDraft(channelId, 0);
    }

    let messageOptions = {};
    if (PendingReplyStore) {
        const pendingReply = PendingReplyStore.getPendingReply(channelId);
        if (pendingReply) {
            messageOptions = MessageUtils.getSendMessageOptionsForReply(pendingReply);
        }
    }

    if ((ctrlKey || !sendAsLink) && !shiftKey) {
        let file: File | null = null;

        if (sticker?.isAnimated) {
            if (!ffmpegState) {
                throw new Error("FFmpeg state is not provided");
            }
            if (!ffmpegState?.ffmpeg) {
                throw new Error("FFmpeg is not provided");
            }
            if (!ffmpegState?.isLoaded) {
                throw new Error("FFmpeg is not loaded");
            }

            file = await toGIF(sticker.image, ffmpegState.ffmpeg);
        }
        else {
            const response = await fetch(sticker.image, { cache: "force-cache" });
            // const blob = await response.blob();
            const orgImageUrl = URL.createObjectURL(await response.blob());
            const processedImage = await resizeImage(orgImageUrl);

            const filename = sticker.filename ?? (new URL(sticker.image)).pathname.split("/").pop();
            let mimeType = "image/png";
            switch (filename?.split(".").pop()?.toLowerCase()) {
                case "jpg":
                case "jpeg":
                    mimeType = "image/jpeg";
                    break;
                case "gif":
                    mimeType = "image/gif";
                    break;
                case "webp":
                    mimeType = "image/webp";
                    break;
                case "svg":
                    mimeType = "image/svg+xml";
                    break;
            }
            file = new File([processedImage], filename!, { type: mimeType });
        }

        if (ctrlKey) {
            promptToUploadParent.promptToUpload([file], ChannelStore.getChannel(channelId), 0);
            return;
        }

        MessageUpload.uploadFiles({
            channelId,
            draftType: 0,
            hasSpoiler: false,
            options: messageOptions || {},
            parsedMessage: {
                content: messageContent
            },
            uploads: [
                new CloudUpload({
                    file,
                    platform: 1
                }, channelId, false, 0)
            ]
        });
    } else if (shiftKey) {
        if (!messageContent.endsWith(" ") || !messageContent.endsWith("\n")) messageContent += " ";
        messageContent += sticker.image;

        if (ctrlKey && textEditor && textEditor.insertText && typeof textEditor.insertText === "function") {
            textEditor.insertText(messageContent);
        } else {
            MessageUtils._sendMessage(channelId, {
                content: sticker.image
            }, messageOptions || {});
        }
    } else {
        MessageUtils._sendMessage(channelId, {
            content: `${messageContent} ${sticker.image}`.trim()
        }, messageOptions || {});
    }
}

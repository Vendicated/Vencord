/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { findByCodeLazy, findByPropsLazy, findLazy } from "@webpack";
import { ChannelStore } from "@webpack/common";

import { Sticker } from "./types";

const MessageUpload = findByPropsLazy("instantBatchUpload");
const UploadObject = findLazy(m => m.prototype && m.prototype.upload && m.prototype.getSize);
const PendingReplyStore = findByPropsLazy("getPendingReply");
const MessageUtils = findByPropsLazy("sendMessage");
const DraftStore = findByPropsLazy("getDraft", "getState");
const promptToUpload = findByCodeLazy("UPLOAD_FILE_LIMIT_ERROR");

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

export async function sendSticker({
    channelId,
    sticker,
    sendAsLink,
    ctrlKey,
    shiftKey
}: { channelId: string; sticker: Sticker; sendAsLink?: boolean; ctrlKey: boolean; shiftKey: boolean; }) {
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
        const response = await fetch(sticker.image, { cache: "force-cache" });
        // const blob = await response.blob();
        const orgImageUrl = URL.createObjectURL(await response.blob());
        const processedImage = await resizeImage(orgImageUrl);

        const filename = (new URL(sticker.image)).pathname.split("/").pop();
        const file = new File([processedImage], filename!, { type: "image/png" });

        if (ctrlKey) {
            promptToUpload([file], ChannelStore.getChannel(channelId), 0);
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
                new UploadObject({
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

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

import { sleep } from "@utils/misc";
import { MessageAttachment } from "discord-types/general";

import { Flogger, Native, settings } from "../..";
import { LoggedAttachment, LoggedMessage, LoggedMessageJSON } from "../../types";
import { memoize } from "../memoize";
import { deleteImage, getImage, writeImage, } from "./ImageManager";

export function getFileExtension(str: string) {
    const matches = str.match(/(\.[a-zA-Z0-9]+)(?:\?.*)?$/);
    if (!matches) return null;

    return matches[1];
}

export function isImage(url: string) {
    return /\.(jpe?g|png|gif|bmp)(\?.*)?$/i.test(url);
}

export function isAttachmentImage(attachment: MessageAttachment) {
    return isImage(attachment.filename ?? attachment.url) || (attachment.content_type?.split("/")[0] === "image");
}

function transformAttachmentUrl(messageId: string, attachmentUrl: string) {
    const url = new URL(attachmentUrl);
    url.searchParams.set("messageId", messageId);

    return url.toString();
}

export async function cacheImage(url: string, attachmentIdx: number, attachmentId: string, messageId: string, channelId: string, fileExtension: string | null, attempts = 0) {
    const res = await fetch(url);
    if (res.status !== 200) {
        if (res.status === 404 || res.status === 403) return;
        attempts++;
        if (attempts > 3) {
            Flogger.warn(`Failed to get image ${attachmentId} for caching, error code ${res.status}`);
            return;
        }

        await sleep(1000);
        return cacheImage(url, attachmentIdx, attachmentId, messageId, channelId, fileExtension, attempts);
    }
    const ab = await res.arrayBuffer();
    const imageCacheDir = settings.store.imageCacheDir ?? await Native.getDefaultNativeImageDir();
    const path = `${imageCacheDir}/${attachmentId}${fileExtension}`;

    await writeImage(imageCacheDir, `${attachmentId}${fileExtension}`, new Uint8Array(ab));

    return path;
}


export async function cacheMessageImages(message: LoggedMessage | LoggedMessageJSON) {
    try {
        for (let i = 0; i < message.attachments.length; i++) {
            const attachment = message.attachments[i];
            if (!isAttachmentImage(attachment)) {
                Flogger.log("skipping", attachment.filename);
                continue;
            }
            // apparently proxy urls last longer
            attachment.url = transformAttachmentUrl(message.id, attachment.proxy_url);

            const fileExtension = getFileExtension(attachment.filename ?? attachment.url) ?? attachment.content_type?.split("/")?.[1] ?? ".png";
            const path = await cacheImage(attachment.url, i, attachment.id, message.id, message.channel_id, fileExtension);

            if (path == null) {
                Flogger.error("Failed to save image from attachment. id: ", attachment.id);
                continue;
            }

            attachment.fileExtension = fileExtension;
            attachment.path = path;
        }

    } catch (error) {
        Flogger.error("Error caching message images:", error);
    }
}

export async function deleteMessageImages(message: LoggedMessage | LoggedMessageJSON) {
    for (let i = 0; i < message.attachments.length; i++) {
        const attachment = message.attachments[i];
        await deleteImage(attachment.id);
    }
}

export const getAttachmentBlobUrl = memoize(async (attachment: LoggedAttachment) => {
    const imageData = await getImage(attachment.id, attachment.fileExtension);
    if (!imageData) return null;

    const blob = new Blob([imageData]);
    const resUrl = URL.createObjectURL(blob);

    return resUrl;
});

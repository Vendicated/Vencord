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

import { MessageAttachment } from "discord-types/general";

import { Flogger, settings } from "../..";
import { LoggedAttachment, LoggedMessage, LoggedMessageJSON } from "../../types";
import { memoize } from "../memoize";
import { deleteImage, downloadAttachment, getImage, } from "./ImageManager";

export function getFileExtension(str: string) {
    const matches = str.match(/(\.[a-zA-Z0-9]+)(?:\?.*)?$/);
    if (!matches) return null;

    return matches[1];
}

export function isAttachmentGoodToCache(attachment: MessageAttachment, fileExtension: string) {
    if (attachment.size > settings.store.attachmentSizeLimitInMegabytes * 1024 * 1024) {
        Flogger.log("Attachment too large to cache", attachment.filename);
        return false;
    }
    const attachmentFileExtensionsStr = settings.store.attachmentFileExtensions.trim();

    if (attachmentFileExtensionsStr === "")
        return true;

    const allowedFileExtensions = attachmentFileExtensionsStr.split(",");

    if (fileExtension.startsWith(".")) {
        fileExtension = fileExtension.slice(1);
    }

    if (!fileExtension || !allowedFileExtensions.includes(fileExtension)) {
        Flogger.log("Attachment not in allowed file extensions", attachment.filename);
        return false;
    }

    return true;
}

export async function cacheMessageImages(message: LoggedMessage | LoggedMessageJSON) {
    try {
        for (const attachment of message.attachments) {
            const fileExtension = getFileExtension(attachment.filename ?? attachment.url) ?? attachment?.content_type?.split("/")?.[1] ?? ".png";

            if (!isAttachmentGoodToCache(attachment, fileExtension)) {
                Flogger.log("skipping", attachment.filename);
                continue;
            }

            attachment.oldUrl = attachment.url;
            attachment.oldProxyUrl = attachment.proxy_url;

            // only normal urls work if theres a charset in the content type /shrug
            if (attachment?.content_type?.includes(";")) {
                attachment.proxy_url = attachment.url;
            } else {
                // apparently proxy urls last longer
                attachment.url = attachment.proxy_url;
                attachment.proxy_url = attachment.url;
            }

            attachment.fileExtension = fileExtension;

            const path = await downloadAttachment(attachment);

            if (!path) {
                Flogger.error("Failed to cache attachment", attachment);
                continue;
            }

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

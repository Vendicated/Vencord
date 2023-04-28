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

import { findByPropsLazy,findLazy } from "@webpack";

import { Sticker } from "./types";

const MessageUpload = findByPropsLazy("instantBatchUpload");
const UploadObject = findLazy(m => m.prototype && m.prototype.upload && m.prototype.getSize);
const PendingReplyStore = findByPropsLazy("getPendingReply");
const MessageUtils = findByPropsLazy("sendMessage");
const DraftStore = findByPropsLazy("getDraft", "getState");

export async function sendSticker(channelId: string, sticker: Sticker, sendAsLink: boolean = false) {
    let messageContent = "";
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

    if (!sendAsLink) {
        const response = await fetch(sticker.url, { cache: "force-cache" });
        const blob = await response.blob();
        const filename = (new URL(sticker.url)).pathname.split("/").pop();
        const ext = filename?.split(".").pop() ?? "png";
        const file = new File([blob], filename ?? "sticker.png", { type: `image/${ext}` });

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
    } else {
        MessageUtils._sendMessage(channelId, {
            content: `${messageContent} ${sticker.url}`.trim()
        }, messageOptions || {});
    }
}

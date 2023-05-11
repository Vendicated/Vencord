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
        const blob = await response.blob();
        const filename = (new URL(sticker.image)).pathname.split("/").pop();
        const ext = filename?.split(".").pop() ?? "png";

        const file = new File([blob], filename!, { type: `image/${ext}` });

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

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

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

const MessageUpload = findByPropsLazy("instantBatchUpload");
const MessageUtils = findByPropsLazy("sendMessage");
const AttachmentUtils = findByPropsLazy("remove", "removeFiles");
const DraftUtils = findByPropsLazy("saveDraft", "clearDraft");

enum DraftType {
    ChannelMessage = 0,
    ThreadSettings = 1,
    FirstThreadMessage = 2,
}

export default definePlugin({
    name: "Remove Attachment Limit",
    description: "Sends attachments that are more than 10 in multiple messages.",
    authors: [Devs.Arjix],

    patches: [{
        find: ".UPLOAD_FILE_LIMIT_ERROR,{existing_count",
        replacement: {
            match: /else if\(.{1,5}.getUploadCount\(\w\.id,\w\)\+\w\.length.*?\.length}\)}/,
            replace: "/*$&*/",
        }
    }],

    start() {
        this.preSendListener = addPreSendListener(async (channelId, message, { uploads, replyOptions }) => {
            if (uploads && uploads.length > 10) {
                if (message.content.trim())
                    MessageUtils._sendMessage(channelId, message, replyOptions);

                for (let i = 0; i < uploads.length; i += 10) {
                    const chunk = uploads.slice(i, i + 10);

                    await MessageUpload.uploadFiles({
                        channelId,
                        draftType: DraftType.ChannelMessage,
                        hasSpoiler: false,
                        options: (!message.content.trim()) ? replyOptions : {},
                        parsedMessage: { content: i === 0 ? message.content : "" },
                        uploads: chunk
                    });
                }

                message.content = "";
                AttachmentUtils.clearAll(channelId, DraftType.ChannelMessage);
                DraftUtils.clearDraft(channelId, DraftType.ChannelMessage);

                return { cancel: true };
            }
        });
    },
    stop() {
        removePreSendListener(this.preSendListener);
    }
});

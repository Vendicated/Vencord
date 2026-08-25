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

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { generateId, sendBotMessage } from "@api/Commands";
import { EyeIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { IconComponent, StartAt } from "@utils/types";
import { CloudUpload, MessageAttachment } from "@vencord/discord-types";
import { DraftStore, DraftType, UploadAttachmentStore, UserStore, useStateFromStores } from "@webpack/common";

const objectURLMap = new Map<string, string[]>();

const getDraft = (channelId: string) => DraftStore.getDraft(channelId, DraftType.ChannelMessage);

const getImageBox = (url: string): Promise<{ width: number, height: number; } | null> =>
    new Promise(res => {
        const img = new Image();
        img.onload = () =>
            res({ width: img.width, height: img.height });

        img.onerror = () =>
            res(null);

        img.src = url;
    });


const getAttachments = async (channelId: string) =>
    await Promise.all(
        UploadAttachmentStore.getUploads(channelId, DraftType.ChannelMessage)
            .map(async (upload: CloudUpload) => {
                const { isImage, filename, spoiler, item: { file } } = upload;

                // FIXME: revoke object url to fix memory leak
                const url = URL.createObjectURL(file);
                const attachment: MessageAttachment = {
                    id: generateId(),
                    filename: spoiler ? "SPOILER_" + filename : filename,
                    // weird eh? if i give it the normal content type the preview doenst work
                    content_type: undefined,
                    size: upload.getSize(),
                    spoiler,
                    // discord adds query params to the url, so we need to add a hash to prevent that
                    url: url + "#",
                    proxy_url: url + "#",
                };

                if (isImage) {
                    const box = await getImageBox(url);
                    if (box) {
                        attachment.width = box.width;
                        attachment.height = box.height;
                    }
                }

                return { attachment, objectURL: url };
            })
    );


const PreviewIcon: IconComponent = ({ height = 20, width = 20, className }) => {
    return (
        <EyeIcon
            width={width}
            height={height}
            className={className}
            style={{ scale: "1.096", translate: "0 -1px" }}
        />
    );
};

const PreviewButton: ChatBarButtonFactory = ({ isAnyChat, isEmpty, type: { attachments }, channel: { id: channelId } }) => {
    const draft = useStateFromStores([DraftStore], () => getDraft(channelId));

    if (!isAnyChat) return null;

    const hasAttachments = attachments && UploadAttachmentStore.getUploads(channelId, DraftType.ChannelMessage).length > 0;
    const hasContent = !isEmpty && draft?.length > 0;

    if (!hasContent && !hasAttachments) return null;

    return (
        <ChatBarButton
            tooltip="Preview Message"
            onClick={async () => {
                const attachments = hasAttachments ? await getAttachments(channelId) : undefined;
                const message = sendBotMessage(
                    channelId,
                    {
                        content: getDraft(channelId),
                        author: UserStore.getCurrentUser(),
                        attachments: attachments?.map(a => a.attachment),
                    }
                );

                if (attachments)
                    objectURLMap.set(message.id, attachments.map(a => a.objectURL));
            }}
            buttonProps={{
                style: {
                    translate: "0 2px"
                }
            }}
        >
            <PreviewIcon />
        </ChatBarButton>
    );

};

export default definePlugin({
    name: "PreviewMessage",
    description: "Lets you preview your message before sending it.",
    tags: ["Chat", "Utility"],
    authors: [Devs.Aria],
    // start early to ensure we're the first plugin to add our button
    // This makes the popping in less awkward
    startAt: StartAt.Init,

    chatBarButton: {
        icon: PreviewIcon,
        render: PreviewButton
    },

    flux: {
        MESSAGE_DELETE({ id: messageId }) {
            const objectURLs = objectURLMap.get(messageId);
            if (objectURLs) {
                objectURLs.forEach(url => URL.revokeObjectURL(url));
                objectURLMap.delete(messageId);
            }
        }
    }
});

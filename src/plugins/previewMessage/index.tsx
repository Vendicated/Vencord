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

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { generateId, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { DraftStore, DraftType, SelectedChannelStore, UserStore, useStateFromStores } from "@webpack/common";
import { MessageAttachment } from "discord-types/general";

const UploadStore = findByPropsLazy("getUploads");

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
        UploadStore.getUploads(channelId, DraftType.ChannelMessage)
            .map(async (upload: any) => {
                const { isImage, filename, spoiler, item: { file } } = upload;
                const url = URL.createObjectURL(file);
                const attachment: MessageAttachment = {
                    id: generateId(),
                    filename: spoiler ? "SPOILER_" + filename : filename,
                    // weird eh? if i give it the normal content type the preview doenst work
                    content_type: undefined,
                    size: await upload.getSize(),
                    spoiler,
                    // discord adds query params to the url, so we need to add a hash to prevent that
                    url: url + "#",
                    proxy_url: url + "#",
                };

                if (isImage) {
                    const box = await getImageBox(url);
                    if (!box) return attachment;

                    attachment.width = box.width;
                    attachment.height = box.height;
                }

                return attachment;
            })
    );


const PreviewButton: ChatBarButton = (props, isMainChat) => {
    const { isEmpty, type: { attachments } } = props;

    const channelId = SelectedChannelStore.getChannelId();
    const draft = useStateFromStores([DraftStore], () => getDraft(channelId));

    if (!isMainChat) return null;

    const hasAttachments = attachments && UploadStore.getUploads(channelId, DraftType.ChannelMessage).length > 0;
    const hasContent = !isEmpty && draft?.length > 0;

    if (!hasContent && !hasAttachments) return null;

    return (
        <ChatBarButton
            tooltip="Preview Message"
            onClick={async () =>
                sendBotMessage(
                    channelId,
                    {
                        content: getDraft(channelId),
                        author: UserStore.getCurrentUser(),
                        attachments: hasAttachments ? await getAttachments(channelId) : undefined,
                    }
                )}
            buttonProps={{
                style: { padding: "0 2px", height: "100%" }
            }}
        >
            <img width={24} height={24} src="https://discord.com/assets/4c5a77a89716352686f590a6f014770c.svg" />
        </ChatBarButton>
    );

};

export default definePlugin({
    name: "PreviewMessage",
    description: "Lets you preview your message before sending it.",
    authors: [Devs.Aria],
    dependencies: ["ChatInputButtonAPI"],

    start: () => addChatBarButton("previewMessage", PreviewButton),
    stop: () => removeChatBarButton("previewMessage"),
});

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
import { Devs } from "@utils/constants";
import definePlugin, { IconComponent, StartAt } from "@utils/types";
import { CloudUpload, MessageAttachment } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { DraftStore, DraftType, UserStore, useStateFromStores } from "@webpack/common";

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
            .map(async (upload: CloudUpload) => {
                const { isImage, filename, spoiler, item: { file } } = upload;
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
                    if (!box) return attachment;

                    attachment.width = box.width;
                    attachment.height = box.height;
                }

                return attachment;
            })
    );


const PreviewIcon: IconComponent = ({ height = 20, width = 20, className }) => {
    return (
        <svg
            fill="currentColor"
            fillRule="evenodd"
            width={width}
            height={height}
            className={className}
            viewBox="0 0 24 24"
            style={{ scale: "1.096", translate: "0 -1px" }}
        >
            <path d="M22.89 11.7c.07.2.07.4 0 .6C22.27 13.9 19.1 21 12 21c-7.11 0-10.27-7.11-10.89-8.7a.83.83 0 0 1 0-.6C1.73 10.1 4.9 3 12 3c7.11 0 10.27 7.11 10.89 8.7Zm-4.5-3.62A15.11 15.11 0 0 1 20.85 12c-.38.88-1.18 2.47-2.46 3.92C16.87 17.62 14.8 19 12 19c-2.8 0-4.87-1.38-6.39-3.08A15.11 15.11 0 0 1 3.15 12c.38-.88 1.18-2.47 2.46-3.92C7.13 6.38 9.2 5 12 5c2.8 0 4.87 1.38 6.39 3.08ZM15.56 11.77c.2-.1.44.02.44.23a4 4 0 1 1-4-4c.21 0 .33.25.23.44a2.5 2.5 0 0 0 3.32 3.32Z" />
        </svg>
    );
};

const PreviewButton: ChatBarButtonFactory = ({ isAnyChat, isEmpty, type: { attachments }, channel: { id: channelId } }) => {
    const draft = useStateFromStores([DraftStore], () => getDraft(channelId));

    if (!isAnyChat) return null;

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
    authors: [Devs.Aria],
    // start early to ensure we're the first plugin to add our button
    // This makes the popping in less awkward
    startAt: StartAt.Init,

    chatBarButton: {
        icon: PreviewIcon,
        render: PreviewButton
    }
});

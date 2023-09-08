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

import { generateId, sendBotMessage } from "@api/Commands";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, ButtonLooks, ButtonWrapperClasses, DraftStore, DraftType, FluxDispatcher, SelectedChannelStore, Tooltip, useEffect, UserStore } from "@webpack/common";
import { Message, MessageAttachment } from "discord-types/general";

interface Props {
    type: {
        analyticsName: string;
        isEmpty: boolean;
        attachments: boolean;
    };
}

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


export function PreviewButton(chatBoxProps: Props) {
    const { isEmpty, attachments } = chatBoxProps.type;

    const channelId = SelectedChannelStore.getChannelId();
    const author = UserStore.getCurrentUser();
    const draft = getDraft(channelId);

    const hasAttachments = attachments && UploadStore.getUploads(channelId, DraftType.ChannelMessage).length > 0;
    const hasContent = !isEmpty && draft?.length > 0;

    const forceUpdate = useForceUpdater();

    useEffect(() => {
        // i tried to use presendListner but i needed to add a delay for it to work. and sometimes it doenst even do anything
        const messageCreate = ({ message, channelId: cid }: { channelId: string, message: Message; }) => {
            if (channelId !== cid || message.author.id !== author.id) return;

            forceUpdate();
        };
        FluxDispatcher.subscribe("MESSAGE_CREATE", messageCreate);

        return () => {
            FluxDispatcher.unsubscribe("MESSAGE_CREATE", messageCreate);
        };

    }, [channelId]);

    if (!hasContent && !hasAttachments) return null;

    return (
        <Tooltip text="Preview Message">
            {tooltipProps => (
                <Button
                    {...tooltipProps}
                    onClick={async () =>
                        sendBotMessage(
                            channelId,
                            {
                                content: getDraft(channelId),
                                author,
                                attachments: hasAttachments ? await getAttachments(channelId) : undefined,
                            }
                        )}
                    size=""
                    look={ButtonLooks.BLANK}
                    innerClassName={ButtonWrapperClasses.button}
                    style={{ padding: "0 2px", height: "100%" }}
                >
                    <div className={ButtonWrapperClasses.buttonWrapper}>
                        <img width={24} height={24} src="https://discord.com/assets/4c5a77a89716352686f590a6f014770c.svg" />
                    </div>
                </Button>
            )}
        </Tooltip>
    );

}

export default definePlugin({
    name: "PreviewMessage",
    description: "Lets you preview your message before sending it.",
    authors: [Devs.Aria],
    patches: [
        {
            find: ".activeCommandOption",
            replacement: {
                match: /(.)\.push.{1,30}disabled:(\i),.{1,20}\},"gift"\)\)/,
                replace: "$&;try{$2||$1.unshift($self.previewIcon(arguments[0]))}catch{}",
            }
        },
    ],

    previewIcon: ErrorBoundary.wrap(PreviewButton, { noop: true }),
});

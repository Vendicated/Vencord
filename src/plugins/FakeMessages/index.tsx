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
import { generateId } from "@api/Commands";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { StartAt } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, DraftStore, DraftType, Forms, MessageActions, React, SelectedChannelStore, SnowflakeUtils, TextInput, UserStore, useStateFromStores } from "@webpack/common";
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

const cl = classNameFactory("vc-trans-");

function FakeMessageModal({ rootProps, channelId, hasAttachments }: { rootProps: ModalProps; channelId: any; hasAttachments: any; }) {
    const [userId, setUserId] = React.useState(UserStore.getCurrentUser().id);

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2" className={cl("modal-title")}>
                    Fake Message
                </Forms.FormTitle>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <section className={Margins.bottom16}>
                    <Forms.FormTitle tag="h3">
                        User ID (leave empty for current user)
                    </Forms.FormTitle>
                    <TextInput
                        value={userId}
                        onChange={setUserId}
                        placeholder="Enter user ID"
                    />
                </section>
            </ModalContent>

            <div className={cl("modal-footer")}>
                <Button
                    color={Button.Colors.BRAND}
                    onClick={async () => {
                        rootProps.onClose();
                        const usr = userId === "null" || userId === ""
                            ? UserStore.getCurrentUser()
                            : UserStore.getUser(userId);

                        if (!usr) {
                            console.error("Invalid user ID");
                            return;
                        }
                        MessageActions.receiveMessage(
                            channelId,
                            {
                                id: SnowflakeUtils.fromTimestamp(Date.now()),
                                type: 0,
                                content: getDraft(channelId),
                                author: {
                                    id: usr.id,
                                    username: usr.username,
                                    discriminator: usr.discriminator,
                                    avatar: usr.avatar,
                                    bot: false
                                },
                                attachments: hasAttachments ? await getAttachments(channelId) : undefined,
                                timestamp: new Date().toISOString(),
                                channel_id: channelId,
                                flags: 0
                            }
                        );
                    }}
                >
                    Done
                </Button>
            </div>
        </ModalRoot>
    );
}

const PreviewButton: ChatBarButtonFactory = ({ isMainChat, isEmpty, type: { attachments } }) => {
    const channelId = SelectedChannelStore.getChannelId();
    const draft = useStateFromStores([DraftStore], () => getDraft(channelId));

    if (!isMainChat) return null;

    const hasAttachments = attachments && UploadStore.getUploads(channelId, DraftType.ChannelMessage).length > 0;
    const hasContent = !isEmpty && draft?.length > 0;

    if (!hasContent && !hasAttachments) return null;

    return (
        <ChatBarButton
            tooltip="Send fake Message"
            onClick={async () => {
                openModal(props => (
                    <FakeMessageModal rootProps={props} channelId={channelId} hasAttachments={hasAttachments} />
                ));
            }}
            buttonProps={{
                style: {
                    translate: "0 2px"
                }
            }}
        >
            <svg
                fill="currentColor"
                fillRule="evenodd"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                style={{ scale: "1.096", translate: "0 -1px" }}
            >
                <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z" />
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "FakeMessages",
    description: "Create realistic messages",
    authors: [Devs.TutlaMC],

    startAt: StartAt.Init,

    renderChatBarButton: PreviewButton,
});

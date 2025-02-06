/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UploadIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, MessageStore, PermissionsBits, PermissionStore, SelectedChannelStore, showToast, Toasts, UserStore } from "@webpack/common";
import { Common, findByPropsLazy } from "webpack";

const uniqueIdProp = findByPropsLazy("uniqueId");

export default definePlugin({
    name: "AddAttachments",
    description: "Allows you to add attachments to a pre-existing message of yours",
    authors: [Devs.Lumap],

    renderMessagePopoverButton(msg) {
        if (UserStore.getCurrentUser().id !== msg.author.id || msg.attachments.length === 10) return null;

        const currChannel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
        if (currChannel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, currChannel)) return null;

        if (![0, 19].includes(msg.type) || msg.hasFlag(8192)) return null;

        return {
            label: "Add attachments",
            icon: UploadIcon,
            message: msg,
            channel: ChannelStore.getChannel(msg.channel_id),
            onClick: () => this.addAttachments(msg.channel_id, msg.id, msg.attachments.length)
        };
    },

    addAttachments(channelId: string, messageId: string, messageAttachments: number) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "*/*";
        input.multiple = true;
        input.click();

        input.addEventListener("change", async () => {
            if (!input.files) return input.remove();

            if ((10 - messageAttachments) < input.files.length) {
                showToast(`You can only add ${10 - messageAttachments} more attachments to this message.`, Toasts.Type.FAILURE);
                return input.remove();
            }

            showToast("Uploading, this can take a while...", Toasts.Type.CLOCK);

            const files = Array.from(input.files).map(file => ({
                filename: file.name,
                file_size: file.size,
                id: uniqueIdProp.uniqueId(),
                is_clip: false
            }));

            const attachmentsReq = (await Common.RestAPI.post({
                url: `/channels/${channelId}/attachments`,
                body: { files }
            })).body.attachments as { id: string, upload_url: string, upload_filename: string }[];

            const uploadPromises = attachmentsReq.map((uploadedFile, index) =>
                fetch(uploadedFile.upload_url, {
                    method: "PUT",
                    body: input.files![index]
                }).then(() => ({
                    id: uploadedFile.id,
                    uploaded_filename: uploadedFile.upload_filename,
                    filename: input.files![index].name
                }))
            );

            const newAttachments = await Promise.all(uploadPromises);

            const msg = MessageStore.getMessage(channelId, messageId);

            await Common.RestAPI.patch({
                url: `/channels/${channelId}/messages/${messageId}`,
                body: {
                    attachments: [
                        ...msg.attachments,
                        ...newAttachments
                    ]
                }
            });

            showToast("Attachments added successfully!", Toasts.Type.SUCCESS);

            input.remove();
        });
    }
});

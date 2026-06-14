/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UploadIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, MessageStore, PermissionsBits, PermissionStore, RestAPI, SelectedChannelStore, showToast, Toasts, UserStore } from "@webpack/common";

const { uniqueId } = findByPropsLazy("uniqueId");

function addAttachments(channelId: string, messageId: string, existingAttachmentCount: number) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*/*";
    input.multiple = true;
    input.click();

    input.addEventListener("change", async () => {
        const { files } = input;
        if (!files) return input.remove();

        if (files.length + existingAttachmentCount > 10) {
            showToast(`You can only add ${10 - existingAttachmentCount} more attachments to this message.`, Toasts.Type.FAILURE);
            return input.remove();
        }

        showToast("Uploading, this can take a while...", Toasts.Type.CLOCK);

        const { body: { attachments } } = await RestAPI.post({
            url: `/channels/${channelId}/attachments`,
            body: {
                files: Array.from(files, file => ({
                    filename: file.name,
                    file_size: file.size,
                    id: uniqueId(),
                    is_clip: false
                }))
            }
        }) as { body: { attachments: { id: string, upload_url: string, upload_filename: string; }[]; }; };

        const newAttachments = await Promise.all(
            attachments.map((file, i) =>
                fetch(file.upload_url, {
                    method: "PUT",
                    body: files[i]
                }).then(() => ({
                    id: file.id,
                    uploaded_filename: file.upload_filename,
                    filename: files[i].name
                }))
            )
        );


        const msg = MessageStore.getMessage(channelId, messageId);

        await RestAPI.patch({
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

export default definePlugin({
    name: "AddAttachments",
    description: "Allows you to add attachments to a pre-existing message of yours",
    authors: [Devs.Lumap],

    messagePopoverButton: {
        icon: UploadIcon,
        render(msg) {
            if (UserStore.getCurrentUser().id !== msg.author.id || msg.attachments.length === 10) return null;

            const currChannel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
            if (currChannel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, currChannel)) return null;

            if (![0, 19].includes(msg.type) || msg.hasFlag(8192)) return null;

            return {
                label: "Add attachments",
                icon: UploadIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => addAttachments(msg.channel_id, msg.id, msg.attachments.length)
            };
        },
    },
});

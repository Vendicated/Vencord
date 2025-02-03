/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UploadIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, MessageStore, PermissionsBits, PermissionStore, SelectedChannelStore, showToast, UserStore } from "@webpack/common";
import { Common } from "webpack";

export default definePlugin({
    name: "AddAttachments",
    description: "Allows you to add attachments to a pre-existing message of yours",
    authors: [Devs.Lumap],

    renderMessagePopoverButton(msg) {
        if (UserStore.getCurrentUser().id !== msg.author.id || msg.attachments.length === 10) return null;

        const currChannel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
        if (currChannel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, currChannel)) return null;

        if (![0,19].includes(msg.type) || msg.hasFlag(8192)) return null;

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
                showToast(`You can only add ${10 - messageAttachments} more attachments to this message.`, 2);
                return input.remove();
            }

            showToast("Uploading...");

            async function uploadLoop(file: File) {
                const attachmentsReq = (await Common.RestAPI.post({
                    url: `/channels/${channelId}/attachments`,
                    body: {
                        files: [
                            {
                                filename: file.name,
                                file_size: file.size,
                                id: Math.round(Math.random() * 99999999),
                                is_clip: false
                            }
                        ]
                    }
                })).body.attachments[0];

                await fetch(attachmentsReq.upload_url, {
                    method: "PUT",
                    body: file
                });

                const msg = MessageStore.getMessage(channelId, messageId);

                await Common.RestAPI.patch({
                    url: `/channels/${channelId}/messages/${messageId}`,
                    body: {
                        attachments: [
                            ...msg.attachments,
                            {
                                id: attachmentsReq.id,
                                uploaded_filename: attachmentsReq.upload_filename,
                                filename: file.name
                            }
                        ]
                    }
                });
            }

            for (let i = 0; i < input.files.length; i++) {
                await uploadLoop(input.files[i]);
            }

            input.remove();
        });
    }
});

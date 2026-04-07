/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { RestAPI, showToast, Toasts } from "@webpack/common";

const NEWS_CHANNEL_TYPE = 5;

const UserStore = findByPropsLazy("getCurrentUser");
const ChannelStore = findStoreLazy("ChannelStore");


export default definePlugin({
    name: "autoPublishAnnoucements",
    description: "Allows you to auto publish messages sent on announcements channels",
    authors: [Devs.WaveDev],
    flux: {
        "MESSAGE_CREATE": function (event) {
            const { message } = event;
            const currentUser = UserStore.getCurrentUser();
            const channel = ChannelStore.getChannel(message.channel_id);

            if (!message.author || !currentUser || !channel) return;
            if (message.author.id !== currentUser.id) return;

            if (channel.type !== NEWS_CHANNEL_TYPE) return;

            // skip as it is not sent yet
            if (event.optimistic) return;

            setTimeout(async () => {
                try {
                    await RestAPI.post({
                        url: `/channels/${message.channel_id}/messages/${message.id}/crosspost`,
                    });
                    showToast("Automatically published message", Toasts.Type.SUCCESS);

                } catch (err) {
                    console.error(
                        `autoPublishMessages: Failed to publish message ${message.id}:`,
                        err,
                    );
                    showToast("Failed to automatically publish message, check console for logs.", Toasts.Type.FAILURE);

                }
            }, 500);
            return;
        }
    }
});

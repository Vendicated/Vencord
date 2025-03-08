/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher, UserStore } from "@webpack/common";

export default definePlugin({
    name: "AlwaysPing",
    description: "You will always get pinged when replied to.",
    authors: [Devs.z1xus],

    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", this.onMessageCreate);
    },

    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", this.onMessageCreate);
    },

    onMessageCreate(event) {
        const currentUserId = UserStore.getCurrentUser().id;
        const { message } = event;

        if (message.author.id !== currentUserId &&
            message.referenced_message &&
            message.referenced_message.author.id === currentUserId &&
            !message.mentions.some(mention => mention.id === currentUserId)) {

            message.mentions.push({ id: currentUserId });
            message.mentioned = true;

            FluxDispatcher.dispatch(event);

            return;
        }
    }
});

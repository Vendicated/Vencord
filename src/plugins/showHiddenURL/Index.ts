/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, MessageStore, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    method: {
        description: "URL Place",
        type: OptionType.SELECT,
        options: [
            { label: "After the Hyperlink", value: "after", default: true },
            { label: "Before the Hyperlink", value: "before" },
        ],
    },
    ignoreSelf: {
        description: "Whether to ignore your Hyperlinked messages.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
    },
});

export default definePlugin({
    name: "showHiddenURL",
    description: "Displays the hidden URL next to the Hyperlinked message.",
    authors: [Devs.Scab, Devs.Lenny],

    start() {
        this.initialize();
    },

    initialize() {
        let currentUserID;

        try {
            currentUserID = UserStore.getCurrentUser().id;
        } catch (error) {
            console.error("Failed to get current user ID", error);
            return;
        }

        const handlemessage = (event: any) => {
            try {
                if (event.type === "MESSAGE_CREATE") {
                    handlenewmessage(event.message);
                } else if (event.type === "MESSAGE_UPDATE") {
                    handleupdatedmessage(event.message);
                }
            } catch (error) {
                console.error("Error handling message", error);
            }
        };

        const handlenewmessage = (message: any) => {
            if (!message) return;

            const iscurrentusermessage = message.author.id === currentUserID;
            if (settings.store.ignoreSelf && iscurrentusermessage) return;

            const markdownlinkregex = /\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g;
            if (markdownlinkregex.test(message.content)) {
                message.content = message.content.replace(markdownlinkregex, (match, text, url) => {
                    if (settings.store.method === "before") {
                        return `(${url}) ${text}`;
                    }
                    return `${text} (${url})`;
                });

                const channelmessages = MessageStore.getMessages(message.channel_id);
                const storedmessage = channelmessages && channelmessages._array.find((msg: any) => msg.id === message.id);

                if (storedmessage) {
                    storedmessage.content = message.content;
                }
            }
        };

        const handleupdatedmessage = (message: any) => {
            if (!message) return;

            const iscurrentusermessage = message.author.id === currentUserID;
            if (settings.store.ignoreSelf && iscurrentusermessage) return;

            const markdownlinkregex = /\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g;
            if (markdownlinkregex.test(message.content)) {
                message.content = message.content.replace(markdownlinkregex, (match, text, url) => {
                    if (settings.store.method === "before") {
                        return `(${url}) ${text}`;
                    }
                    return `${text} (${url})`;
                });

                const channelmessages = MessageStore.getMessages(message.channel_id);
                const storedmessage = channelmessages && channelmessages._array.find((msg: any) => msg.id === message.id);

                if (storedmessage) {
                    storedmessage.content = message.content;
                }
            }
        };

        FluxDispatcher.subscribe("MESSAGE_CREATE", handlemessage);
        FluxDispatcher.subscribe("MESSAGE_UPDATE", handlemessage);

        return () => {
            FluxDispatcher.unsubscribe("MESSAGE_CREATE", handlemessage);
            FluxDispatcher.unsubscribe("MESSAGE_UPDATE", handlemessage);
        };
    },

    stop() {
    },

    settings,
});

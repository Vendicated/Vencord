/*
* Stalcord, Stalk your friends but somehow worse
* Copyright (c) 2025 gmblahaj*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";
import { Message } from "discord-types/general";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

const settings = definePluginSettings({
    userIdToWatch: {
        type: OptionType.STRING,
        name: "User ID to monitor",
        description: "The Discord User ID to get notifications for",
        default: "",
        isValid: (value: string) => value === "" || /^\d{17,19}$/.test(value),
    },
    notifyInDMs: {
        type: OptionType.BOOLEAN,
        name: "Notify for DMs",
        description: "Whether to notify when the user sends direct messages",
        default: true,
    },
});

export default definePlugin({
    name: "Stalcord",
    description: "Stalk people, aka get sent a notification if a user sends a message in any server you're both in",
    authors: [{ name: "gmblahaj" }],
    version: "1.0",

    settings,

    start() {
        this.requestNotificationPermission();
        this.boundOnMessage = this.onMessage.bind(this);
        FluxDispatcher.subscribe("MESSAGE_CREATE", this.boundOnMessage);
    },

    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", this.boundOnMessage);
    },

    async requestNotificationPermission() {
        if (Notification.permission !== "granted") {
            try {
                const perm = await Notification.requestPermission();
                if (perm === "granted") {
                    new Notification("NotifyOnUserMessage", {
                        body: "Notifications enabled!",
                    });
                }
            } catch (err) {
                console.error("Notification permission error:", err);
            }
        }
    },

    onMessage({ message }: { message: Message; }) {
        try {
            const userIdToWatch = settings.store.userIdToWatch;
            if (!userIdToWatch || !message?.author || message.author.id !== userIdToWatch) return;

            if (!settings.store.notifyInDMs && !message.guild_id) return;

            this.showNotification(message);
        } catch (err) {
            console.error("Message handling error:", err);
        }
    },

    showNotification(message: Message) {
        if (Notification.permission !== "granted") return;

        const hasAttachment = message.attachments && message.attachments.length > 0;
        const notificationContent = hasAttachment ? "Attachment" : message.content.substring(0, 200);

        const notifData = {
            username: message.author.username,
            content: notificationContent,
            channelId: message.channel_id,
            guildId: message.guild_id ?? "@me",
            messageId: message.id
        };

        try {
            const notification = new Notification(`Message from ${notifData.username}`, {
                body: notifData.content,
                tag: `user-message-${notifData.messageId}`
            });

            notification.onclick = () => {
                try {
                    const path = `/channels/${notifData.guildId}/${notifData.channelId}/${notifData.messageId}`;

                    // 1. First try Vesktop's native navigation
                    if (window.DiscordNative?.window?.navigate) {
                        window.DiscordNative.window.navigate(path);
                        notification.close();
                        return;
                    }

                    // 2. Try Electron's shell as fallback
                    if (window.DiscordNative?.shell?.openExternal) {
                        window.DiscordNative.shell.openExternal(`discord://${path}`);
                        notification.close();
                        return;
                    }

                    // It kinda wants to die when switching channels but it works :shrug:

                    window.location.href = path;
                } catch (err) {
                    console.error("Navigation error:", err);

                    window.open(`discord://${path}`, "_blank");
                } finally {
                    notification.close();
                }
            };
        } catch (err) {
            console.error("Notification error:", err);
        }
    }
});
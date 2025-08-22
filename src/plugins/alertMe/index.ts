/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import { Message } from "@vencord/discord-types";
import { NavigationRouter, ChannelStore } from "@webpack/common";
import { Notices } from "@api/index";

const settings = definePluginSettings({
    targetUserId: {
        type: OptionType.STRING,
        description: "User ID of the user you want to guarantee notifications from.",
        default: "1213462649325617154",
        isRequired: true,
        isValid: (value: string) => {
            return /^\d{17,20}$/.test(value) ? true : "Invalid user ID format";
        }
    },
    soundUrl: {
        type: OptionType.STRING,
        description: "URL of the sound to play when the target user messages you.",
        default: "https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg",
    },
    iconURL: {
        type: OptionType.STRING,
        description: "URL of the icon to show in the notification.",
        default: "https://vencord.dev/assets/cute-logo.avif",
    },
    showMessageContent: {
        type: OptionType.BOOLEAN,
        description: "Show the message content in the notification.",
        default: true,
    },
    enableSound: {
        type: OptionType.BOOLEAN,
        description: "Enable sound notification.",
        default: true,
    },
    persistNotification: {
        type: OptionType.BOOLEAN,
        description: "Make the notification stay until dismissed.",
        default: false,
    },
    enableDesktopNotification: {
        type: OptionType.BOOLEAN,
        description: "Enable desktop notifications.",
        default: true,
    },
    reNotifyInterval: {
        type: OptionType.NUMBER,
        description: "Interval in seconds to ignore new incoming messages from the target user after an alert (0 to disable).",
        default: 30,
        min: 0,
        max: 600,
    },
});



export default definePlugin({
    name: "alertMe",
    description: "Shows a notification whenever a specific user messages you in DMs regardless of all notification other settings.",
    authors: [Devs.Qtpie],
    settings,

    patches: [
        {
            find: "MessageStore",
            replacement: [
                {
                    match: /(?<=function (\i)\((\i)\){)(?=.*MESSAGE_CREATE:\1)/,
                    replace: (_, funcName, argName) => `
                        if(${argName}.message && $self.isTargetDMMessage(${argName}.message)) {
                            $self.notify(${argName}.message);
                        }
                    `
                }
            ]
        }
    ],

    isTargetDMMessage(message: Message) {
        const channel = ChannelStore.getChannel(message.channel_id);
        return channel?.type === 1 && message.author.id === settings.store.targetUserId;
    },

    notify(message: Message) {

        const { username } = message.author;
        const { showMessageContent, iconURL, soundUrl, enableSound, enableDesktopNotification, persistNotification, reNotifyInterval } = settings.store;

        if (reNotifyInterval > 0) {
            const lastNotified = (this as any)._lastNotified || 0;
            const now = Date.now();
            if (now - lastNotified < reNotifyInterval * 1000) {
                return;
            }
            (this as any)._lastNotified = now;
        }
        if (enableSound) {
            const audio = new Audio(soundUrl);
            audio.volume = 0.5;
            audio.play().catch(err =>
                console.error("Failed to play notification sound:", err)
            );
        }

        if (!enableDesktopNotification) return;

        if (Notification.permission !== "granted") {
            Notices.showNotice(
                "AlertMe Plugin: Desktop notifications are enabled in plugin settings but notifications are being blocked. Your browser/app settings may be preventing them. You must enable them and restart discord to recieve notifications from the target user or disable them in the plugin settings to avoid this message. Press OK to try requesting permission.",
                "OK",
                () => {
                    Notification.requestPermission().then(result => {
                        if (result === "granted") {
                            new Notification("Notifications enabled!", {
                                body: "You’ll now receive alerts from the target user. Note: you may need to restart discord before the plugin functions correctly."
                            });
                        }
                    });
                    Notices.popNotice(); // Does this just not work or am I just stupid?
                }

            );
            return;
        }

        const messageContent = message.content || "[Attachment/Embed]";
        const notificationBody = showMessageContent
            ? `New message from ${username}: ${messageContent}`
            : `New message from ${username}`;

        const notif = new Notification("Message from target user", {
            body: notificationBody,
            icon: iconURL,
            requireInteraction: persistNotification,
            tag: "alertMe-Plugin",
            renotify: true,
        });
        // On click, navigate to the DM channel
        // For some reason desktop discord doesn't focus the window on notification click but web does.
        // Might be a discord bug because for some reason it works when the desktop app is running in windows 7 compatibility mode but not normally.
        // We do not attempt any workaround here.
        notif.onclick = () => {
            const channel = ChannelStore.getChannel(message.channel_id);
            if (channel) {
                NavigationRouter.transitionTo(`/channels/@me/${channel.id}`);
            }
            notif.close();
        };

    },
});

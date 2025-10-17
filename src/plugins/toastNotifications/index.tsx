/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import type { Channel, Message } from "@vencord/discord-types";
import { ApplicationStreamingStore, Button, ChannelStore, MessageStore, PresenceStore, SelectedChannelStore, StreamerModeStore, UserStore } from "@webpack/common";
import { Webpack } from "Vencord";

import { showNotification } from "./components/Notifications";

const MuteStore = Webpack.findByPropsLazy("isSuppressEveryoneEnabled");

let ignoredUsers: string[] = [];

export const settings = definePluginSettings({
    position: {
        type: OptionType.SELECT,
        description: "The position of the toast notification.",
        options: [
            {
                label: "Bottom Left",
                value: "bottom-left",
                default: true
            },
            {
                label: "Top Left",
                value: "top-left"
            },
            {
                label: "Top Right",
                value: "top-right"
            },
            {
                label: "Bottom Right",
                value: "bottom-right"
            },
        ]
    },
    ignoredUsers: {
        type: OptionType.STRING,
        description: "A list of user IDs (separate by commas) to ignore displaying notifications for.",
        onChange: () => { ignoredUsers = settings.store.ignoredUsers.split(",").filter(userId => /^\d{17,20}$/.test(userId)); },
        default: "",
        placeholder: "000000000000000000,111111111111111111,222222222222222222"
    },
    respectDoNotDisturb: {
        type: OptionType.BOOLEAN,
        description: "Do not show notifications when your status is Do Not Disturb.",
        default: false
    },
    disableWhileScreenSharing: {
        type: OptionType.BOOLEAN,
        description: "Do not show notifications when sharing your screen on Discord.",
        default: false
    },
    disableInStreamerMode: {
        type: OptionType.BOOLEAN,
        description: "Do not show notifications when streamer mode is enabled.",
        default: true
    },
    timeout: {
        type: OptionType.SLIDER,
        description: "Time in seconds notifications will be shown for.",
        default: 5,
        markers: makeRange(1, 15, 1)
    },
    opacity: {
        type: OptionType.SLIDER,
        description: "The visible opacity of the notification.",
        default: 100,
        markers: makeRange(10, 100, 10)
    },
    maxNotifications: {
        type: OptionType.SLIDER,
        description: "Maximum number of notifications displayed at once.",
        default: 3,
        markers: makeRange(1, 5, 1)
    },
    exampleButton: {
        type: OptionType.COMPONENT,
        description: "Show an example toast notification.",
        component: () => <Button onClick={showExampleNotification}>Show Example Notification</Button>
    }
});

export default definePlugin({
    name: "ToastNotifications",
    description: "Show a pop-up notification whenever you receive a direct message.",
    authors: [Devs.Skully],
    settings,
    flux: {
        async MESSAGE_CREATE({ message }: { message: Message; }) {
            const channel: Channel = ChannelStore.getChannel(message.channel_id);
            const currentUser = UserStore.getCurrentUser();

            // Determine whether or not to show notifications.
            if (
                (channel.guild_id) // If this is a guild message and not a private message.
                || (message.author.id === currentUser.id) // If message is from the user.
                || (channel.id === SelectedChannelStore.getChannelId()) // If the user is currently in the channel.
                || (!MuteStore.allowAllMessages(channel)) // If user has muted the channel.
                || (ignoredUsers.includes(message.author.id)) // If the user is ignored.
                || (settings.store.respectDoNotDisturb && PresenceStore.getStatus(currentUser.id) === "dnd") // If notifications are disabled while in DND.
                || (settings.store.disableWhileScreenSharing && ApplicationStreamingStore.getCurrentUserActiveStream()?.state === "ACTIVE") // If notifications are disabled while screen sharing.
                || (settings.store.disableInStreamerMode && StreamerModeStore.enabled) // If notifications are disabled in streamer mode.
            ) return;

            // Retrieve the message component for the message.
            const mockedMessage: Message = MessageStore.getMessages(message.channel_id).receiveMessage(message).get(message.id);
            if (!mockedMessage) return console.error(`[ToastNotifications] Failed to retrieve mocked message from MessageStore for message ID ${message.id}!`);

            // Show the notification.
            showNotification({ message, mockedMessage, channel });
        }
    }
});

/**
 * Helper function to show an example notification.
 */
function showExampleNotification(): Promise<void> {
    // Create a mock message object.
    return showNotification({
        message: { content: "This is an example notification!" },
        channel: { guild_id: null, isForumPost: () => false, isPrivate: () => false },
        mockedMessage: {
            content: "This is an example notification!",
            channel_id: null,
            guild_id: null,
            type: 0,
            author: UserStore.getCurrentUser(),
            timestamp: Date.now(),
            embeds: [],
            attachments: [],
            stickerItems: [],
            stickers: [],
            components: [],
            codedLinks: [],
            reactions: [],
            giftCodes: [],
            messageSnapshots: [],
            isFirstMessageInForumPost: () => false,
            isCommandType: () => false,
            hasFlag: () => false,
            getGuildId: () => null,
            getChannelId: () => null,
            isEdited: () => false,
            isInteractionPlaceholder: () => false,
            isSystemDM: () => false,
            hasPotions: () => false,
        },
    } as any);
}

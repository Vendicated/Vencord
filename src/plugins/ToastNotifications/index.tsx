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

import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, ChannelStore, SelectedChannelStore, UserStore } from "@webpack/common";
import type { Channel, Message } from "discord-types/general";
import { ReactNode } from "react";
import { Webpack } from "Vencord";

import MentionComponent from "./components/MentionComponent";
import { getUserDisplayName, showNotification } from "./components/Notifications";
import { MentionType, MessageTypes, NotificationData } from "./types";

const MuteStore = Webpack.findByPropsLazy("isSuppressEveryoneEnabled");
const SelectedChannelActionCreators = findByPropsLazy("selectPrivateChannel");

export const settings = definePluginSettings({
    position: {
        type: OptionType.SELECT,
        description: "The position of the toast notification",
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
    timeout: {
        type: OptionType.SLIDER,
        description: "Time in seconds notifications will be shown for",
        default: 5,
        markers: makeRange(1, 15, 1)
    },
    opacity: {
        type: OptionType.SLIDER,
        description: "Opacity of the notification",
        default: 100,
        markers: makeRange(10, 100, 10)
    },
    maxNotifications: {
        type: OptionType.SLIDER,
        description: "Maximum number of notifications displayed at once",
        default: 3,
        markers: makeRange(1, 5, 1)
    },
    exampleButton: {
        type: OptionType.COMPONENT,
        description: "Show an example toast notification.",
        component: () =>
            <Button onClick={showExampleNotification}>
                Show Example Notification
            </Button>
    }
});

/**
 * Helper function to enrich the notification body with mentionable elements.
 *
 * @param   {NotificationData} 	notification 	The notification data object.
 * @param   {string}    		guildId     	Optional guild ID for role mentioned.
 */
const MENTIONABLES_REGEX = /<([@#&])(\d{17,20})>/g;
function enrichMentionables(notification: NotificationData, guildId: string): void {
    if (!MENTIONABLES_REGEX.test(notification.body)) return; // No enrichment required if there are no mentions.

    const mentions: ReactNode[] = [];
    let lastIndex = 0;

    notification.body.replace(MENTIONABLES_REGEX, (match, type: MentionType, id: string, offset: number) => {
        mentions.push(
            notification.body.slice(lastIndex, offset), // Push the text before the mentionable element.
            <MentionComponent type={type} id={id} guildId={guildId} /> // Add the mention itself as a styled span.
        );

        // Update the last index to the end of the match.
        lastIndex = offset + match.length;
        return match;
    });

    notification.richBody = <>{mentions}</>;
}

export default definePlugin({
    name: "ToastNotifications",
    description: "Show a toast notification whenever you receive a direct message.",
    authors: [Devs.Skully],
    settings,
    flux: {
        async MESSAGE_CREATE({ message }: { message: Message; }) {
            const channel: Channel = ChannelStore.getChannel(message.channel_id);
            const currentUser = UserStore.getCurrentUser();

            // Determine whether or not to show notifications.
            if (
                (
                    (channel.guild_id) // If this is a guild message and not a private message.
                    || (message.author.id === currentUser.id) // If message is from the user.
                    || (!MuteStore.allowAllMessages(channel)) // If user has muted the channel.
                    || (channel.id === SelectedChannelStore.getChannelId()) // If the user is currently in the channel.
                )
            ) return;

            // Prepare the notification.
            const Notification: NotificationData = {
                title: getUserDisplayName(message.author),
                icon: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.webp?size=128`,
                body: message.content,
                richBody: null,
                permanent: false,
                onClick: () => SelectedChannelActionCreators.selectPrivateChannel(message.channel_id),
            };

            const notificationText = message.content.length > 0 ? message.content : false;

            // If this channel is a group DM, include the channel name.
            if (channel.isGroupDM()) {
                let channelName = channel.name?.trim() ?? false;
                if (!channelName) { // If the channel doesn't have a set name, use the first 3 recipients.
                    channelName = channel.rawRecipients.slice(0, 3).map(e => e.username).join(", ");
                }

                // Finally, truncate the channel name if it's too long.
                const truncatedChannelName = channelName.length > 20 ? channelName.substring(0, 20) + "..." : channelName;
                Notification.title = `${message.author.username} (${truncatedChannelName})`;
            }
            else if (channel.guild_id) // If this is a guild message and not a private message.
            {
                Notification.title = `${getUserDisplayName(message.author)} (#${channel.name})`;
            }

            // Handle specific message types.
            switch (message.type) {
                case MessageTypes.CALL: {
                    Notification.body = "Started a call with you!";
                    break;
                }
                case MessageTypes.CHANNEL_RECIPIENT_ADD: {
                    const actor = UserStore.getUser(message.author.id);
                    const targetUser = UserStore.getUser((message.mentions as any)[0]?.id);

                    Notification.body = `${getUserDisplayName(targetUser)} was added to the group by ${getUserDisplayName(actor)}.`;
                    break;
                }
                case MessageTypes.CHANNEL_RECIPIENT_REMOVE: {
                    const actor = UserStore.getUser(message.author.id);
                    const targetUser = UserStore.getUser((message.mentions as any)[0]?.id);

                    if (actor.id !== targetUser.id) {
                        Notification.body = `${getUserDisplayName(targetUser)} was removed from the group by ${getUserDisplayName(actor)}.`;
                    } else {
                        Notification.body = "Left the group.";
                    }
                    break;
                }
                case MessageTypes.CHANNEL_NAME_CHANGE: {
                    Notification.body = `Changed the channel name to '${message.content}'.`;
                    break;
                }
                case MessageTypes.CHANNEL_ICON_CHANGE: {
                    Notification.body = "Changed the channel icon.";
                    break;
                }
                case MessageTypes.CHANNEL_PINNED_MESSAGE: {
                    Notification.body = "Pinned a message.";
                    break;
                }
            }

            // Message contains an embed.
            if (message.embeds.length !== 0) {
                Notification.body = notificationText || "Sent an embed.";
            }

            // Message contains a sticker.
            if (message?.stickerItems) {
                Notification.body = notificationText || "Sent a sticker.";
            }

            // Message contains an attachment.
            if (message.attachments.length !== 0) {
                const images = message.attachments.filter(e => typeof e?.content_type === "string" && e?.content_type.startsWith("image"));
                // Label the notification with the attachment type.
                if (images.length !== 0) {
                    Notification.body = notificationText || "Sent an image.";
                    Notification.image = images[0].url;
                } else {
                    Notification.body += ` [Attachment: ${message.attachments[0].filename}]`;
                }
            }

            // TODO: Format emotes properly.
            const matches = Notification.body.match(new RegExp("(<a?:\\w+:\\d+>)", "g"));
            if (matches) {
                for (const match of matches) {
                    Notification.body = Notification.body.replace(new RegExp(`${match}`, "g"), `:${match.split(":")[1]}:`);
                }
            }

            // Replace any mention of users, roles and channels.
            enrichMentionables(Notification, channel.guild_id);

            // Show the notification.
            showNotification(Notification);
        }
    }
});

/**
 * Helper function to show an example notification.
 *
 * @returns {Promise<void>} A promise that resolves when the notification is shown.
 */
function showExampleNotification(): Promise<void> {
    return showNotification({
        title: "Example Notification",
        icon: `https://cdn.discordapp.com/avatars/${UserStore.getCurrentUser().id}/${UserStore.getCurrentUser().avatar}.webp?size=128`,
        body: "This is an example toast notification!",
        permanent: false
    });
}

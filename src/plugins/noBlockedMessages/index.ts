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

import { definePluginSettings, migratePluginSetting } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { MessageStore, RelationshipStore } from "@webpack/common";

interface ChannelStreamDividerProps {
    type: "DIVIDER",
    content?: string,
    contentKey?: string,
    unreadId?: string,
}

interface ChannelStreamMessageProps {
    type: "MESSAGE",
    content: Message,
}

interface ChannelStreamGroupProps {
    type: "MESSAGE_GROUP_BLOCKED" | "MESSAGE_GROUP_IGNORED",
    content: ChannelStreamMessageProps[] | any,
}

migratePluginSetting("NoBlockedMessages", "disableNotifications", "ignoreMessages");
migratePluginSetting("NoBlockedMessages", "alsoHideIgnoredUsers", "applyToIgnoredUsers");

const settings = definePluginSettings({
    alsoHideIgnoredUsers: {
        description: "Also hide messages from ignored users.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    disableNotifications: {
        description: "Hide new message notifications for blocked/ignored users. Always true if \"Default Hide Users\" is enabled below and the user triggering the notification is not exempted in \"Override Users\".",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    },
    hideBlockedUserReplies: {
        description: "Hide replies to blocked/ignored users.",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false,
    },
    defaultHideUsers: {
        type: OptionType.BOOLEAN,
        description: "If enabled, messages from blocked/ignored users will be completely hidden and any messages from user IDs in the override list will be collapsed (default Discord behavior) instead. If disabled, messages from blocked/ignored users will be collapsed and any messages from user IDs in the override list will be completely hidden instead.",
        default: true,
        restartNeeded: false,
    },
    overrideUsers: {
        type: OptionType.STRING,
        description: "Comma separated list of user IDs which will be hidden or collapsed instead of the default behavior selected above.",
        restartNeeded: false,
        default: ""
    },
});

export default definePlugin({
    name: "NoBlockedMessages",
    description: "Hide all blocked/ignored messages from chat completely.",
    authors: [Devs.rushii, Devs.Samu, Devs.jamesbt365, Devs.Elvyra, EquicordDevs.Etorix],
    settings,
    patches: [
        ...[
            '"MessageStore"',
            '"ReadStateStore"'
        ].map(find => ({
            find,
            replacement: [
                {
                    match: /(?<=function (\i)\((\i)\){)(?=.*MESSAGE_CREATE:\1)/,
                    replace: (_, _funcName, props) => `if($self.disableNotification(${props}.message)){return;};`
                }
            ]
        })),
        {
            find: '"forum-post-action-bar-"',
            replacement: [
                {
                    match: /(\i).map\(/,
                    replace: "$self.filterStream($1).map("
                }
            ]
        },
    ],

    hideBlockedMessage(userId: string) {
        const overrideUsers = settings.store.overrideUsers.split(",").map(id => id.trim()).filter(id => id.length > 0);

        if (settings.store.defaultHideUsers) {
            // If hidden by default, overriding shows messages as collapsed.
            return overrideUsers.includes(userId);
        } else {
            // If collapsed by default, overriding hides messages.
            return !overrideUsers.includes(userId);
        }
    },

    shouldKeepMessage(message: Message) {
        const blocked = this.isBlocked(message);
        const replyToBlocked = this.isReplyToBlocked(message);

        if (blocked) return [this.hideBlockedMessage(message.author.id), true];
        if (replyToBlocked) return [this.hideBlockedMessage(replyToBlocked.author.id), true];

        // [Message Visible, Author Blocked/Ignored]
        return [true, false];
    },

    disableNotification(message: Message) {
        if (!message) return false;
        const messageFilteredData = this.shouldKeepMessage(message);
        const messageHidden = !messageFilteredData[0];
        const messageBlocked = messageFilteredData[1];
        // Always disable notifications for completely hidden messages as not doing so will
        // cause the client to scroll up into the loaded messages in search of an
        // unread message which it can't find because it was filtered.
        return messageHidden || (messageBlocked && settings.store.disableNotifications);
    },

    filterStream(channelStream: [ChannelStreamGroupProps | ChannelStreamMessageProps | ChannelStreamDividerProps]) {
        const { alsoHideIgnoredUsers, disableNotifications, hideBlockedUserReplies, defaultHideUsers, overrideUsers } = settings.use();

        const newChannelStream = channelStream.map(item => {
            if (item.type === "MESSAGE_GROUP_BLOCKED" || (item.type === "MESSAGE_GROUP_IGNORED" && alsoHideIgnoredUsers)) {
                const groupItem = item as ChannelStreamGroupProps;

                const filteredContent = groupItem.content.filter((item: ChannelStreamMessageProps) => {
                    return item.type !== "MESSAGE" || this.shouldKeepMessage(item.content)[0];
                });

                return filteredContent.some(item => item.type === "MESSAGE") ? { ...groupItem, content: filteredContent } : null;
            }

            return (item.type !== "MESSAGE" || this.shouldKeepMessage((item as ChannelStreamMessageProps).content)[0]) ? item : null;
        }).filter(item => item !== null);

        let lastItem = newChannelStream[newChannelStream.length - 1];

        // Remove the NEW Message divider if it is the last item,
        // implying the messages it was announcing got filtered.
        while (lastItem && lastItem.type === "DIVIDER" && lastItem.unreadId !== undefined) {
            newChannelStream.pop();
            lastItem = newChannelStream[newChannelStream.length - 1];
        }

        return newChannelStream;
    },

    isReplyToBlocked(message: Message) {
        if (!settings.store.hideBlockedUserReplies) return false;

        try {
            // Messages received from the non-focused channel may have a referenced_message property.
            let repliedMessage: Message | null = (message as any).referenced_message || null;

            if (!repliedMessage) {
                const messageReference = message.messageReference || (message as any).message_reference;
                repliedMessage = messageReference ? MessageStore.getMessage(messageReference.channel_id, messageReference.message_id) : null;
            }

            return repliedMessage && this.isBlocked(repliedMessage) ? repliedMessage : false;
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if referenced message is blocked or ignored:", e);
        }
    },

    isBlocked(message: Message) {
        try {
            if (RelationshipStore.isBlocked(message.author.id)) {
                return true;
            }

            return settings.store.alsoHideIgnoredUsers && RelationshipStore.isIgnored(message.author.id);
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if message is blocked or ignored:", e);
        }
    },
});

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

import { definePluginSettings, migratePluginSetting, Settings } from "@api/Settings";
import { containsBlockedKeywords } from "@equicordplugins/blockKeywords";
import { Devs, EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Message, User } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { MessageStore, RelationshipStore } from "@webpack/common";

const ReferencedMessageStore = findStoreLazy("ReferencedMessageStore");

interface ChannelStreamDividerProps {
    type: "DIVIDER",
    content?: string,
    contentKey?: string,
    unreadId?: string,
}

interface ChannelStreamMessageProps {
    type: "MESSAGE" | "THREAD_STARTER_MESSAGE",
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
        description: "Hide new message notifications for blocked users. Always true if \"Default Hide Users\" is enabled below and the user triggering the notification is not exempted in \"Override Users\".",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    },
    allowAutoModMessages: {
        description: "Allow messages sent by AutoMod to bypass filtering.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
    },
    hideBlockedUserReplies: {
        description: "Hide replies to blocked users.",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false,
    },
    defaultHideUsers: {
        type: OptionType.BOOLEAN,
        description: "If enabled, messages from blocked users will be completely hidden and any messages from user IDs in the override list will be collapsed (default Discord behavior) instead. If disabled, messages from blocked users will be collapsed and any messages from user IDs in the override list will be completely hidden instead.",
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
                    match: /(?<=\);)(let \i=null,\i=\[\],\i=(\i))/,
                    replace: "$2=$self.filterStream($2);$1"
                }
            ]
        },
    ],

    hideSuppressedMessage(userId: string) {
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
        const suppressed = this.isSuppressed(message);
        const replyToSuppressed = this.isReplyToSuppressed(message);

        if (message.type === 24 && settings.store.allowAutoModMessages) return [true, suppressed];
        if (suppressed) return [this.hideSuppressedMessage(message.author.id), true];
        if (replyToSuppressed) return [this.hideSuppressedMessage(replyToSuppressed.author.id), true];

        // [Message Visible, Author Blocked/Ignored]
        return [true, false];
    },

    disableNotification(message: Message) {
        if (!message) return false;
        const messageFilteredData = this.shouldKeepMessage(message);
        const messageHidden = !messageFilteredData[0];
        const messageSuppressed = messageFilteredData[1];
        // Always disable notifications for completely hidden messages as not doing so will
        // cause the client to scroll up into the loaded messages in search of an
        // unread message which it can't find because it was filtered.
        return messageHidden || (messageSuppressed && settings.store.disableNotifications);
    },

    filterStream(channelStream: [ChannelStreamGroupProps | ChannelStreamMessageProps | ChannelStreamDividerProps]) {
        const {
            alsoHideIgnoredUsers,
            disableNotifications,
            hideBlockedUserReplies,
            allowAutoModMessages,
            defaultHideUsers,
            overrideUsers
        } = settings.use([
            "alsoHideIgnoredUsers",
            "disableNotifications",
            "hideBlockedUserReplies",
            "allowAutoModMessages",
            "defaultHideUsers",
            "overrideUsers"
        ]);

        const newChannelStream: [ChannelStreamGroupProps | ChannelStreamMessageProps | ChannelStreamDividerProps] = [] as any;

        channelStream.forEach(item => {
            const isBlockedGroup = item.type === "MESSAGE_GROUP_BLOCKED";
            const isIgnoredGroup = item.type === "MESSAGE_GROUP_IGNORED";
            const isThreadStarter = item.type === "THREAD_STARTER_MESSAGE";
            const hasThreadStarter = (isBlockedGroup || isIgnoredGroup) && item.content?.[0]?.type === "THREAD_STARTER_MESSAGE";
            const threadCreatorMessage = (isThreadStarter && (item.content as Message)) || (hasThreadStarter && (item.content?.[0]?.content as Message)) || null;
            const actualStarterMessage = (threadCreatorMessage?.messageReference && ReferencedMessageStore.getMessageByReference(threadCreatorMessage.messageReference)?.message) || null;
            let skipStarter = false;

            if (hasThreadStarter && threadCreatorMessage && actualStarterMessage) {
                // Discord attributes the thread starter message to whoever starts the thread, even if the thread was
                // started with a different user's message. To ensure the correct message is used when determining whether
                // to show or hide, we get the reference and use that.
                //
                // Additionally, if a blocked or ignored user is the one that started the thread, but the actual message author
                // is not blocked or ignored, Discord incorrectly groups the message with the others. To fix this, we render the
                // message on its own and skip rendering it as part of the group.
                const relationship = this.getRelationshipStatus(actualStarterMessage.author);
                const isSuppressedRelationship = relationship.ignored || relationship.blocked;

                if (!isSuppressedRelationship) {
                    newChannelStream.push(item.content[0]);
                    skipStarter = true;
                }
            }

            if (isBlockedGroup || (isIgnoredGroup && alsoHideIgnoredUsers)) {
                const filteredContent: [Message | ChannelStreamDividerProps] = item.content.filter((subItem, index) => {
                    const isMessage = ["MESSAGE", "THREAD_STARTER_MESSAGE"].includes(subItem.type);
                    const isThreadStarter = index === 0 && subItem.type === "THREAD_STARTER_MESSAGE";
                    const message = (isMessage && (isThreadStarter ? actualStarterMessage : subItem.content)) || null;
                    return !(isThreadStarter && skipStarter) && (!message || this.shouldKeepMessage(message)[0]);
                });

                const shouldKeep = filteredContent.length;
                shouldKeep && newChannelStream.push({ ...item, content: filteredContent });
            } else {
                const isMessage = ["MESSAGE", "THREAD_STARTER_MESSAGE"].includes(item.type);
                const message = (isMessage && (isThreadStarter ? actualStarterMessage : item.content)) || null;
                const shouldKeep = !isMessage || this.shouldKeepMessage(message)[0];
                shouldKeep && newChannelStream.push(item);
            }
        });

        let lastItem = newChannelStream[newChannelStream.length - 1];

        // Remove the NEW Message and Date dividers if they are the last
        // item, implying the messages they were separating got filtered.
        while (lastItem && lastItem.type === "DIVIDER") {
            newChannelStream.pop();
            lastItem = newChannelStream[newChannelStream.length - 1];
        }

        return newChannelStream;
    },

    isReplyToSuppressed(message: Message) {
        if (!settings.store.hideBlockedUserReplies) return false;

        try {
            // Messages received from the non-focused channel may have a referenced_message property.
            let repliedMessage: Message | null = (message as any).referenced_message || null;

            if (!repliedMessage) {
                const messageReference = message.messageReference || (message as any).message_reference;
                repliedMessage = messageReference ? MessageStore.getMessage(messageReference.channel_id, messageReference.message_id) : null;
            }

            return repliedMessage && this.isSuppressed(repliedMessage) ? repliedMessage : false;
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if referenced message is blocked or ignored:", e);
        }
    },

    isSuppressed(message: Message) {
        try {
            const { BlockKeywords } = Settings.plugins;
            const blockedContent = BlockKeywords?.enabled && BlockKeywords?.ignoreBlockedMessages && containsBlockedKeywords(message);
            const relationship = this.getRelationshipStatus(message.author);
            return blockedContent || relationship.blocked || (relationship.ignored && settings.store.alsoHideIgnoredUsers);
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if message is blocked or ignored:", e);
        }
    },

    getRelationshipStatus(user: User): { ignored: boolean, blocked: boolean; } {
        const isBlocked = RelationshipStore.isBlocked(user.id);
        const isIgnored = RelationshipStore.isIgnored(user.id);
        return { ignored: isIgnored, blocked: isBlocked };
    }
});

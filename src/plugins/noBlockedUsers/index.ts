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

import { definePluginSettings, migratePluginSetting, migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Channel, Message, User } from "@vencord/discord-types";
import { ChannelStore, MessageStore, RelationshipStore } from "@webpack/common";


interface ChannelStreamMessage {
    type: "MESSAGE",
    content: Message,
}

interface ChannelStreamBlockedGroup {
    type: "MESSAGE_GROUP_BLOCKED" | "MESSAGE_GROUP_IGNORED",
    content: ChannelStreamMessage[],
}

// There is other types too, such as for the date separators, but these are not relevant here
type ChannelStreamProps = ChannelStreamMessage | ChannelStreamBlockedGroup;

interface IncompleteMessageReplyRenderProps {
    baseAuthor: User,
    baseMessage: Message,
    channel: Channel,
    isReplyAuthorBlocked: boolean,
    isReplyAuthorIgnored: boolean,
    repliedAuthor: User,
}

// Remove this migration once enough time has passed
migratePluginSetting("NoBlockedMessages", "ignoreBlockedMessages", "ignoreMessages");
migratePluginSettings("NoBlockedUsers", "NoBlockedMessages");

const settings = definePluginSettings({
    ignoreMessages: {
        description: "Prevents the client from receiving messages from blocked users (if you disable this, you will see invisible unread messages)",
        type: OptionType.BOOLEAN,
        // default to true because it hides unreads from appearing, which is preferred
        default: true,
        restartNeeded: true
    },
    overrideInDms: {
        // Useful – you may want them gone completely in servers but still be able to access their messages in DMs
        // without having to unblock them or disable the plugin, in many cases access to such messages is necessary
        // default true because if you're already viewing DMs with a blocked user, you probably want to see their messages
        // in which case we essentially present the DM chat history as if they weren't blocked
        description: "Show the chat history in DMs as if the user wasn't blocked at all",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
    },
    hideRepliesToBlockedMessages: {
        description: "Hides replies to blocked messages",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false,
    },
    hideUsersFromMemberList: {
        description: "Hide blocked users from the members list in servers",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    hideUsersFromReactions: {
        description: "Hides blocked users from the reaction list and prevents their avatar from showing up (the reaction itself is not hidden)",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    applyToIgnoredUsers: {
        description: "Additionally apply everything to 'ignored' users",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    }
});

export default definePlugin({
    name: "NoBlockedUsers",
    description: "Hides all blocked/ignored users from chat and other sections completely",
    authors: [Devs.rushii, Devs.Samu, Devs.jamesbt365, Devs.Elvyra],
    settings,
    patches: [
        ...[
            '"MessageStore"',
            '"ReadStateStore"'
        ].map(find => ({
            find,
            predicate: () => settings.store.ignoreMessagesFromBlockedUsers,
            replacement: [
                {
                    match: /(?<=function (\i)\((\i)\){)(?=.*MESSAGE_CREATE:\1)/,
                    replace: (_, _funcName, props) => `if($self.shouldIgnoreMessage(${props}?.message)||$self.isReplyToBlocked(${props}?.message))return;`
                }
            ]
        })),
        {
            find: '"forum-post-action-bar-"',
            replacement: [
                {
                    // There is only one occurrence of .map in this module.
                    match: /(\i).map\(/,
                    replace: "$self.filterStream($1).map("
                }
            ]
        },
        {
            find: "._areActivitiesExperimentallyHidden?",
            replacement: [
                {
                    match: /(?<=,premiumSince:\i\}=(\i);)return/,
                    replace: "return !$self.shouldHide($1?.userId)&&",
                },
            ],
            predicate: () => settings.store.hideUsersFromMemberList,
        },
        {
            find: ".reactorDefault",
            replacement: [
                {
                    match: /return(?=.{0,30}.reactorDefault,onContextMenu:\i=>.{0,15}\(\i,(\i),\i\))/,
                    replace: "return $self.shouldHide($1?.id)?null:",
                }
            ],
            predicate: () => settings.store.hideUsersFromReactions,
        },
        {
            find: "contextCommandMessage:{",
            replacement: [
                {
                    match: /\{let(?=.{0,10}\{repliedAuthor)/,
                    replace: "{$self.undoBlockedRepliesInDms(arguments[0]);let",
                },
            ],
        },
    ],

    filterStream(channelStream: ChannelStreamProps[]) {
        // removing MESSAGE_GROUP_BLOCKED hides the "x blocked messages" text.
        // simultaneously we can check if replies are to blocked messages and hide those too
        // or override in DMs to show everything
        // which makes the old method to hide blocked messages obsolete

        if (settings.store.overrideInDms) {
            const newStream: ChannelStreamProps[] = [];
            // each ChannelStream is channel unique, therefore if one message is in a DM channel, all are
            let isDmChannel: boolean;
            channelStream.forEach(elem => {
                if (elem.type === "MESSAGE_GROUP_BLOCKED" || (settings.store.applyToIgnoredUsers && elem.type === "MESSAGE_GROUP_IGNORED")) {
                    // "x" blocked messages -> normal messages if DM and should be shown
                    if (isDmChannel == null) {
                        const checkMsg = elem.content[0].content;
                        isDmChannel = ChannelStore.getChannel(checkMsg?.channel_id)?.isDM(); // can apparently be undefined
                    }
                    // if not in DM channel, hide the blocked message group
                    if (!isDmChannel) return;
                    // A message group blocked has ChannelStreamProps[] as content, with the blocked messages
                    // themselves inside (elem.type is MESSAGE), therefore we can just spread them into the
                    // stream as non-blocked messages, and they will be rendered as normal messages
                    else return newStream.push(...elem.content);
                }
                return newStream.push(elem);
            });
            return newStream;
        }
        return channelStream.filter(
            elem => {
                if (elem.type === "MESSAGE_GROUP_BLOCKED" || (settings.store.applyToIgnoredUsers && elem.type === "MESSAGE_GROUP_IGNORED")) return false;
                else if (elem.type !== "MESSAGE") return true;
                return !this.isReplyToBlocked(elem.content);
            });
    },

    undoBlockedRepliesInDms(data: IncompleteMessageReplyRenderProps) {
        if (!this.shouldShowInDM(data.channel.id) || (!data.isReplyAuthorBlocked && !data.isReplyAuthorIgnored)) return;
        if (data.isReplyAuthorBlocked) data.isReplyAuthorBlocked = false;
        if (data.isReplyAuthorIgnored && settings.store.applyToIgnoredUsers) data.isReplyAuthorIgnored = false;
    },

    shouldShowInDM(channelId: string) {
        return settings.store.overrideInDms && ChannelStore.getChannel(channelId).isDM();
    },

    shouldIgnoreMessage(message: Message) {
        return !this.shouldShowInDM(message.channel_id) && this.shouldHide(message.author.id);
    },

    isReplyToBlocked(message: Message) {
        if (!settings.store.hideRepliesToBlockedMessages) return false;
        if (this.shouldShowInDM(message.channel_id)) return false;

        try {
            const { messageReference } = message;
            if (!messageReference) return false;

            const replyMessage = MessageStore.getMessage(messageReference.channel_id, messageReference.message_id);
            if (!replyMessage) return false; // For some reason in some instances this will be undefined.

            return replyMessage ? this.shouldHide(replyMessage.author.id) : false;
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if referenced message is blocked:", e);
        }
    },

    shouldHide(userId: string) {
        try {
            if (RelationshipStore.isBlocked(userId)) {
                return true;
            }
            return settings.store.applyToIgnoredUsers && RelationshipStore.isIgnored(userId);
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if user is blocked or ignored:", e);
            return false;
        }
    },
});

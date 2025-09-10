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
import { Devs } from "@utils/constants";
import { runtimeHashMessageKey } from "@utils/intlHash";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, i18n, MessageStore, RelationshipStore } from "@webpack/common";

interface MessageDeleteProps {
    // Internal intl message for BLOCKED_MESSAGE_COUNT
    collapsedReason: () => any;
}

// Remove this migration once enough time has passed
migratePluginSetting("NoBlockedMessages", "ignoreMessages", "ignoreBlockedMessages");
const settings = definePluginSettings({
    ignoreMessages: {
        description: "Completely ignores incoming messages from blocked and ignored (if enabled) users",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    hideRepliesToBlockedMessages: {
        description: "Hides replies to blocked messages.",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false,
    },
    applyToIgnoredUsers: {
        description: "Additionally apply to 'ignored' users",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    whitelistedUsers: {
        type: OptionType.STRING,
        description: "User IDs seperated by a comma and a space",
        restartNeeded: true,
        default: ""
    },
    whitelistedServers: {
        type: OptionType.STRING,
        description: "Server IDs seperated by a comma and a space",
        restartNeeded: true,
        default: ""
    },
    whitelistedChannels: {
        type: OptionType.STRING,
        description: "Channel IDs seperated by a comma and a space",
        restartNeeded: true,
        default: ""
    }
});

export default definePlugin({
    name: "NoBlockedMessages",
    description: "Hides all blocked/ignored messages from chat completely",
    authors: [Devs.rushii, Devs.Samu, Devs.jamesbt365, Devs.Elvyra],
    settings,

    patches: [
        {
            find: ".__invalid_blocked,",
            replacement: [
                {
                    match: /let{expanded:\i,[^}]*?collapsedReason[^}]*}/,
                    replace: "if($self.shouldHide(arguments[0]))return null;$&"
                },
                {
                    match: /(?<=messages:(\i).*?=\i),/,
                    replace: ";$self.keepWhitelisted($1);let"
                },
                {
                    match: /(?<=messages:(\i).*?onClick:\i,collapsedReason:\i)/,
                    replace: ",messages:$1"
                }
            ]
        },
        ...[
            '"MessageStore"',
            '"ReadStateStore"'
        ].map(find => ({
            find,
            predicate: () => settings.store.ignoreMessages,
            replacement: [
                {
                    match: /(?<=function (\i)\((\i)\){)(?=.*MESSAGE_CREATE:\1)/,
                    replace: (_, _funcName, props) => `if($self.shouldIgnoreMessage(${props}.message)||$self.isReplyToBlocked(${props}.message))return;`
                }
            ]
        })),
        {
            find: "referencedUsernameProfile,referencedAvatarProfile",
            replacement: [
                {
                    match: /(?=\(0,\i.jsx\)\(\i.\i,\{offset)/,
                    replace: "$&!$self.isReplyToBlocked(arguments[0].message)&&",
                }
            ],
        },
    ],

    keepWhitelisted(messages: any) {
        try {
            messages.content = messages.content.filter((msg: any) => {
                const authorId = msg.content?.author?.id;
                const channelId = msg.content?.channel_id;
                const isWhitelisted = this.checkWhitelist(authorId, channelId);
                return isWhitelisted;
            });
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to filter whitelisted messages:", e);
        }
    },

    shouldHide(props: any): boolean {
        try {
            const { messages, collapsedReason: collapsedReasonFn } = props;
            if (!messages.content || messages.content.length === 0) return true;

            const collapsedReason = collapsedReasonFn();

            const hasWhitelisted = messages.content?.some((msg: any) => {
                const authorId = msg.content.author.id;
                const channelId = msg.content.channel_id;
                return this.checkWhitelist(authorId, channelId);
            });
            if (hasWhitelisted) return false;

            const blockedReason = i18n.t[runtimeHashMessageKey("BLOCKED_MESSAGE_COUNT")]();
            const ignoredReason = settings.store.applyToIgnoredUsers
                ? i18n.t[runtimeHashMessageKey("IGNORED_MESSAGE_COUNT")]()
                : null;

            return collapsedReason === blockedReason || collapsedReason === ignoredReason;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    shouldIgnoreMessage(message: Message) {
        try {
            if (this.checkWhitelist(message.author.id, message.channel_id)) return false;
            if (RelationshipStore.isBlocked(message.author.id)) return true;
            return settings.store.applyToIgnoredUsers && RelationshipStore.isIgnored(message.author.id);
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if user is blocked or ignored:", e);
            return false;
        }
    },

    isReplyToBlocked(message: Message) {
        if (!settings.store.hideRepliesToBlockedMessages) return false;
        try {
            const { messageReference, author, channel_id } = message;
            if (!messageReference) return false;
            if (this.checkWhitelist(author.id, channel_id)) return false;

            const replyMessage = MessageStore.getMessage(messageReference.channel_id, messageReference.message_id);
            if (!replyMessage) return false;

            return replyMessage ? this.shouldIgnoreMessage(replyMessage) : false;
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if referenced message is blocked:", e);
        }
    },

    checkWhitelist(userId: string, channelId: string) {
        try {
            const channel = ChannelStore.getChannel(channelId);
            const users = settings.store.whitelistedUsers.split(",").map(s => s.trim());
            const channels = settings.store.whitelistedChannels.split(",").map(s => s.trim());
            const servers = settings.store.whitelistedServers.split(",").map(s => s.trim());

            if (users.includes(userId)) return true;
            if (channels.includes(channelId)) return true;
            if (servers.includes(channel?.guild_id)) return true;
            return false;
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check whitelist:", e);
            return false;
        }
    }
});

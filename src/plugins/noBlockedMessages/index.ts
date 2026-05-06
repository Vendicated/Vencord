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
import { Message, MessageJSON } from "@vencord/discord-types";
import { MessageType } from "@vencord/discord-types/enums";
import { FluxDispatcher, i18n, MessageStore, RelationshipStore, SelectedChannelStore } from "@webpack/common";

interface MessageDeleteProps {
    // Internal intl message for BLOCKED_MESSAGE_COUNT
    collapsedReason: () => any;
}

let ReplyStore: any;

// Some referenced messages aren't in the MessageStore so this falls back to the ReplyStore cache
function getReferencedMessage(channelId: string, messageId: string) {
    const fromMessageStore = MessageStore.getMessage(channelId, messageId);
    if (fromMessageStore) return fromMessageStore;

    const fromReplyStore = ReplyStore?._channelCaches?.get(channelId)?._cachedMessages?.get(messageId)?.message;
    if (fromReplyStore) return fromReplyStore;
}

function rerenderChannelMessages() {
    if (!settings.store.hideRepliesToBlockedUsers) return;

    try {
        const channelId = SelectedChannelStore.getChannelId();
        if (!channelId) return;

        const messages = MessageStore.getMessages(channelId)?._array ?? [];
        for (const message of messages) {
            if (message.type !== MessageType.REPLY) continue;
            FluxDispatcher.dispatch({
                type: "MESSAGE_UPDATE",
                message
            });
        }
    } catch (e) {
        new Logger("NoBlockedMessages").error("Failed to refresh visible messages:", e);
    }
}

// Remove this migration once enough time has passed
migratePluginSetting("NoBlockedMessages", "ignoreBlockedMessages", "ignoreMessages");
const settings = definePluginSettings({
    ignoreMessages: {
        description: "Completely ignores incoming messages from blocked and ignored (if enabled) users",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    applyToIgnoredUsers: {
        description: "Additionally apply to 'ignored' users",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    hideRepliesToBlockedUsers: {
        description: "Hide replies to blocked users",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    }
});

export default definePlugin({
    name: "NoBlockedMessages",
    description: "Hides all blocked/ignored messages from chat completely",
    authors: [Devs.rushii, Devs.Samu, Devs.jamesbt365],
    tags: ["Accessibility", "Chat"],
    settings,

    patches: [
        {
            find: ".__invalid_blocked,",
            replacement: [
                {
                    match: /let{messages:\i,[^}]*?collapsedReason[^}]*}/,
                    replace: "if($self.shouldHide(arguments[0]))return null;$&"
                }
            ]
        },
        {
            find: '"MessageStore"',
            predicate: () => settings.store.ignoreMessages,
            replacement: [
                {
                    match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                    replace: (_, props) => `if($self.shouldIgnoreMessage(${props}.message))return;`
                }
            ]
        },
        {
            find: '"ReadStateStore"',
            predicate: () => settings.store.ignoreMessages,
            replacement: [
                {
                    match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                    replace: (_, props) => `if($self.shouldIgnoreMessage(${props}.message))return;`
                }
            ]
        },
        {
            find: "Message must not be a thread starter message",
            predicate: () => settings.store.hideRepliesToBlockedUsers,
            replacement: {
                match: /return (null!=\i\?\(0,\i\.jsx\)\(\i,\{flashKey:\i,[\s\S]*?`bg-flash-\$\{\i\}`\):\i)/,
                replace: "return $self.shouldHideReply(arguments[0])?null:$1",
            }
        },
        {
            find: "ReferencedMessageStore",
            predicate: () => settings.store.hideRepliesToBlockedUsers,
            replacement: [
                {
                    match: /_channelCaches=new Map;/,
                    replace: "$&_=$self.setReplyStore(this);"
                }
            ]
        }
    ],

    flux: {
        RELATIONSHIP_ADD() {
            rerenderChannelMessages();
        },
        RELATIONSHIP_UPDATE() {
            rerenderChannelMessages();
        },
        RELATIONSHIP_REMOVE() {
            rerenderChannelMessages();
        }
    },

    setReplyStore(store: any) {
        ReplyStore = store;
    },

    shouldIgnoreMessage(message: MessageJSON) {
        try {
            if (RelationshipStore.isBlocked(message.author.id)) {
                return true;
            }
            return settings.store.applyToIgnoredUsers && RelationshipStore.isIgnored(message.author.id);
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if user is blocked or ignored:", e);
            return false;
        }
    },

    shouldHide(props: MessageDeleteProps): boolean {
        try {
            const collapsedReason = props.collapsedReason();
            const is = (key: string) => collapsedReason === i18n.t[runtimeHashMessageKey(key)]();

            return is("BLOCKED_MESSAGE_COUNT") || (settings.store.applyToIgnoredUsers && is("IGNORED_MESSAGE_COUNT"));
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if message should be hidden:", e);
            return false;
        }
    },

    shouldHideReply({ message }: { message?: Message; }) {
        if (!settings.store.hideRepliesToBlockedUsers) return false;
        if (!message || message?.type !== MessageType.REPLY) return false;

        const ref = message.messageReference;
        if (!ref?.channel_id || !ref.message_id) return false;

        const referencedMessage = getReferencedMessage(ref.channel_id, ref.message_id);
        if (!referencedMessage) return false;

        if (RelationshipStore.isBlocked(referencedMessage.author.id)) return true;
        return settings.store.applyToIgnoredUsers && RelationshipStore.isIgnored(referencedMessage.author.id);
    },
});

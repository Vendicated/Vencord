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
import type { ChannelMessages, Message } from "@vencord/discord-types";
import { i18n, ReferencedMessageStore, RelationshipStore } from "@webpack/common";

interface CollapsedMessageProps {
    // Internal intl message for BLOCKED_MESSAGE_COUNT
    collapsedReason: () => any;
}

// Remove this migration once enough time has passed
migratePluginSetting("NoBlockedMessages", "ignoreBlockedMessages", "suppressUnread");
migratePluginSetting("NoBlockedMessages", "ignoreMessages", "suppressUnread");
const settings = definePluginSettings({
    hideReplies: {
        description: "Hides replies to blocked and ignored (if enabled) users",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    suppressUnread: {
        description: "Suppresses unread messages from blocked and ignored (if enabled) users",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    applyToIgnoredUsers: {
        description: "Additionally apply to 'ignored' users",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    }
});
const logger = new Logger("NoBlockedMessages");

export default definePlugin({
    name: "NoBlockedMessages",
    description: "Hides all blocked/ignored messages from chat completely",
    authors: [Devs.rushii, Devs.Samu, Devs.jamesbt365, Devs.paige],
    tags: ["Accessibility", "Chat"],
    settings,

    patches: [
        {
            find: ".__invalid_blocked,",
            replacement: [
                {
                    match: /let{messages:\i,[^}]*?collapsedReason[^}]*}/,
                    replace: "if($self.shouldHideCollapsed(arguments[0]))return null;$&"
                }
            ]
        },
        {
            find: "_channelMessages={}",
            predicate: () => settings.store.hideReplies,
            replacement: {
                match: /static commit\((\i)\)\{/,
                replace: "$&$1=$self.updateChannelMessages($1);"
            }
        },
        {
            find: '"MessageStore"',
            predicate: () => settings.store.suppressUnread,
            replacement: [
                {
                    match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                    replace: (_, props) => `if($self.shouldSuppressUnread(${props}.message))return;`
                }
            ]
        },
        {
            find: '"ReadStateStore"',
            predicate: () => settings.store.suppressUnread,
            replacement: [
                {
                    match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                    replace: (_, props) => `if($self.shouldSuppressUnread(${props}.message))return;`
                }
            ]
        }
    ],

    shouldSuppressUnread(message: Message) {
        return settings.store.suppressUnread && (message.blocked || (settings.store.applyToIgnoredUsers && message.ignored));
    },

    shouldHideUser(userId: string) {
        return RelationshipStore.isBlocked(userId) || (settings.store.applyToIgnoredUsers && RelationshipStore.isIgnored(userId));
    },

    shouldHideCollapsed(props: CollapsedMessageProps) {
        try {
            const collapsedReason = props.collapsedReason();
            const is = (key: string) => collapsedReason === i18n.t[runtimeHashMessageKey(key)]();

            return is("BLOCKED_MESSAGE_COUNT") || (settings.store.applyToIgnoredUsers && is("IGNORED_MESSAGE_COUNT"));
        } catch (e) {
            logger.error("Failed to check if message should be hidden:", e);
            return false;
        }
    },

    updateChannelMessages(messages: ChannelMessages) {
        return messages.reset(messages.map(message => {
            const referenced = ReferencedMessageStore.getMessageByReference(message.messageReference).message;
            const blocked = message.blocked || referenced?.blocked === true;
            const ignored = message.ignored || referenced?.ignored === true;
            return message.set("blocked", blocked).set("ignored", ignored);
        }));
    }
});

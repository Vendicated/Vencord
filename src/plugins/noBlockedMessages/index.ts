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
import { i18n, MessageStore, RelationshipStore } from "@webpack/common";

interface MessageDeleteProps {
    // Internal intl message for BLOCKED_MESSAGE_COUNT
    collapsedReason: () => any;
}

interface ChannelStreamProps {
    // this is incomplete but we only need content and type
    type: string,
    content: Message,
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
    hideRepliesToBlockedMessages: {
        description: "Hides replies to blocked messages",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false,
    },
    applyToIgnoredUsers: {
        description: "Additionally apply to 'ignored' users",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
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
                    replace: "$1.filter(el => !$self.isReplyToBlocked(el)).map(",
                }
            ]
        },
    ],


    isReplyToBlocked(elem: ChannelStreamProps) {
        if (!settings.store.hideRepliesToBlockedMessages) return false;
        // if we don't check for MESSAGE_GROUP_BLOCKED there will be gaps in the chat.
        if (elem.type === "MESSAGE_GROUP_BLOCKED") return true;
        if (elem.type !== "MESSAGE") return false;

        const message: Message = elem.content;
        try {
            const { messageReference } = message;
            if (!messageReference) return false;

            const replyMessage = MessageStore.getMessage(messageReference.channel_id, messageReference.message_id);
            if (!replyMessage) return false; // For some reason in some instances this will be undefined.

            return replyMessage ? this.shouldIgnoreMessage(replyMessage) : false;
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if referenced message is blocked:", e);
        }
    },

    shouldIgnoreMessage(message: Message) {
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
            const blockedReason = i18n.t[runtimeHashMessageKey("BLOCKED_MESSAGE_COUNT")]();
            const ignoredReason = settings.store.applyToIgnoredUsers
                ? i18n.t[runtimeHashMessageKey("IGNORED_MESSAGE_COUNT")]()
                : null;

            return collapsedReason === blockedReason || collapsedReason === ignoredReason;
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to hide blocked message:", e);
            return false;
        }
    }
});

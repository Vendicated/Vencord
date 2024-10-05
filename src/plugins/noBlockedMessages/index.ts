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

import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { MessageStore } from "@webpack/common";
import { Message } from "discord-types/general";

const RelationshipStore = findByPropsLazy("getRelationships", "isBlocked");

interface MessageDeleteProps {
    collapsedReason: {
        message: string;
    };
}

export default definePlugin({
    name: "NoBlockedMessages",
    description: "Hides all blocked messages from chat completely.",
    authors: [Devs.rushii, Devs.Samu, Devs.F53],
    patches: [
        {
            find: "Messages.BLOCKED_MESSAGES_HIDE",
            replacement: [
                {
                    match: /let\{[^}]*collapsedReason[^}]*\}/,
                    replace: "if($self.shouldHide(arguments[0]))return null;$&"
                }
            ]
        },
        ...[
            '"MessageStore"',
            '"ReadStateStore"'
        ].map(find => ({
            find,
            predicate: () => Settings.plugins.NoBlockedMessages.ignoreBlockedMessages === true,
            replacement: [
                {
                    match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                    replace: (_, props) => `if($self.isBlocked(${props}.message))return;`
                }
            ]
        })),
        {
            find: ".messageListItem",
            replacement: {
                match: /(?<=\i=)(?=\(0,(\i)\.jsx)/,
                replace: "!$self.isReplyToBlocked(arguments[0].message)&&"
            }
        }
    ],
    options: {
        ignoreBlockedMessages: {
            description: "Completely ignores (recent) incoming messages from blocked users (locally).",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        },
        hideRepliesToBlockedMessages: {
            description: "Hide replies to messages made by users you've blocked",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: false,
        }
    },

    isReplyToBlocked(message: Message) {
        if (!Settings.plugins.NoBlockedMessages.hideRepliesToBlockedMessages)
            return false;

        const { messageReference } = message;
        if (!messageReference) return false;
        const replyMessage = MessageStore.getMessage(messageReference.channel_id, messageReference.message_id);
        return this.isBlocked(replyMessage);
    },

    isBlocked(message: Message | undefined) {
        if (!message) return false;
        try {
            return RelationshipStore.isBlocked(message.author.id);
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if user is blocked:", e);
        }
    },

    shouldHide(props: MessageDeleteProps) {
        return !props?.collapsedReason?.message.includes("deleted");
    }
});

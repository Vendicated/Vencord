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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { runtimeHashMessageKey } from "@utils/intlHash";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { i18n, MessageStore } from "@webpack/common";
import { Message } from "discord-types/general";

const RelationshipStore = findByPropsLazy("getRelationships", "isBlocked");

const settings = definePluginSettings({
    ignoreBlockedMessages: {
        description: "Completely ignores (recent) incoming messages from blocked users (locally).",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
    },
    hideRepliesToBlockedMessages: {
        description: "Hides replies to blocked messages.",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false,
    },
});

interface MessageDeleteProps {
    // Internal intl message for BLOCKED_MESSAGE_COUNT
    collapsedReason: () => any;
}

export default definePlugin({
    name: "NoBlockedMessages",
    description: "Hides all blocked messages from chat completely.",
    authors: [Devs.rushii, Devs.Samu, Devs.Elvyra],
    settings,

    patches: [
        {
            find: "#{intl::BLOCKED_MESSAGES_HIDE}",
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
            predicate: () => settings.store.ignoreBlockedMessages === true,
            replacement: [
                {
                    match: /(?<=function (\i)\((\i)\){)(?=.*MESSAGE_CREATE:\1)/,
                    replace: (_, _funcName, props) => `if($self.isBlocked(${props}.message)||$self.isReplyToBlocked(${props}.message))return;`
                }
            ]
        })),
        {
            find: "referencedUsernameProfile,referencedAvatarProfile",
            replacement: [
                {
                    match: /CUSTOM_GIFT.*?=(?=\(0,\i.jsx\)\(\i.FocusRing)/,
                    replace: "$&!$self.isReplyToBlocked(arguments[0].message)&&",
                }
            ],
        },
    ],

    isReplyToBlocked(message: Message) {
        if (!settings.store.hideRepliesToBlockedMessages) return false;
        try {
            const { messageReference } = message;
            if (!messageReference) return false;

            const replyMessage = MessageStore.getMessage(messageReference.channel_id, messageReference.message_id);

            return replyMessage ? this.isBlocked(replyMessage) : false;
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if referenced message is blocked:", e);
        }
    },

    isBlocked(message: Message) {
        try {
            return RelationshipStore.isBlocked(message.author.id);
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if user is blocked:", e);
        }
    },

    shouldHide(props: MessageDeleteProps) {
        try {
            return props.collapsedReason() === i18n.t[runtimeHashMessageKey("BLOCKED_MESSAGE_COUNT")]();
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to hide blocked message:", e);
        }
        return false;
    }
});

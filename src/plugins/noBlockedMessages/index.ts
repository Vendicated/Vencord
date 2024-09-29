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
import { Message } from "discord-types/general";

const RelationshipStore = findByPropsLazy("getRelationships", "isBlocked");

export default definePlugin({
    name: "NoBlockedMessages",
    description: "Hides all blocked messages from chat completely.",
    authors: [Devs.rushii, Devs.Samu],
    patches: [
        {
            find: "Messages.BLOCKED_MESSAGES_HIDE",
            replacement: [
                {
                    match: /let\{[^}]*collapsedReason[^}]*\}/,
                    replace: "return null;$&"
                }
            ]
        },
        ...[
            '"MessageStore"',
            '"displayName","ReadStateStore")'
        ].map(find => ({
            find,
            predicate: () => Settings.plugins.NoBlockedMessages.ignoreBlockedMessages === true,
            replacement: [
                {
                    match: /(?<=function (\i)\((\i)\){)(?=.*MESSAGE_CREATE:\1)/,
                    replace: (_, _funcName, props) => `if($self.isBlocked(${props}.message))return;`
                }
            ]
        }))
    ],
    options: {
        ignoreBlockedMessages: {
            description: "Completely ignores (recent) incoming messages from blocked users (locally).",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        },
    },

    isBlocked(message: Message) {
        try {
            return RelationshipStore.isBlocked(message.author.id);
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if user is blocked:", e);
        }
    }
});

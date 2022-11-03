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

import { lazyWebpack } from "../utils";
import { Devs } from "../utils/constants";
import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";
import { filters } from "../webpack";
const RelationshipStore = lazyWebpack(filters.byProps("getRelationships", "isBlocked"));

export default definePlugin({
    name: "NoBlockedMessages",
    description: "Hides all blocked messages from chat completely.",
    authors: [Devs.rushii, Devs.Samu],
    patches: [
        {
            find: 'safety_prompt:"DMSpamExperiment",response:"show_redacted_messages"',
            replacement: [
                {
                    match: /collapsedReason;return (?=\w{1,2}.createElement)/,
                    replace: "collapsedReason; return null;"
                }
            ]
        },
        {
            find: "displayName=\"MessageStore\"",
            predicate: () => Settings.plugins.NoBlockedMessages.ignoreBlockedMessages === true,
            replacement: [
                {
                    match: /(?<=MESSAGE_CREATE:function\((\w)\){var \w=\w\.channelId,\w=\w\.message,\w=\w\.isPushNotification,\w=\w\.\w\.getOrCreate\(\w\));/,
                    replace: ";if(Vencord.Plugins.plugins.IgnoreBlockedUsers.isBlocked(n))return;"
                }
            ]
        }
    ],
    options: {
        ignoreBlockedMessages: {
            description: "Completely ignores (recent) incoming messages from blocked users (locally).",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        },
    },
    isBlocked(message) {
        if (RelationshipStore.isBlocked(message.author.id)) return true;
        else return false;
    }
});

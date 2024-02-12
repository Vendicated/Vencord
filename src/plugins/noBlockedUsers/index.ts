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
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";

const RelationshipStore = findByPropsLazy("getRelationships", "isBlocked");

const settings = definePluginSettings(
    {
        hideBlockedMessages: {
            description: "Hide messages from blocked users.",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
            onChange: (newValue) => {
                if (!newValue) settings.store.ignoreBlockedMessages = false;
            },
        },
        ignoreBlockedMessages: {
            description: "Completely ignores incoming gateway messages from blocked users (locally).",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
        ignoreTyping: {
            description: "Hides blocked users from the currently typing list in chat.",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
        hideReferencedAuthor: {
            description: "Hides blocked authors of the referenced message in replies.",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        },
    },
);

export default definePlugin({
    name: "NoBlockedUsers",
    description: "Hides blocked users and their messages from everywhere possible",
    authors: [Devs.rushii, Devs.Samu],
    patches: [
        // Based on canary 70001c7d67fae9258eb77f27d7addd4a20b99fad
        {
            // Hide the blocked message component from chat
            find: "Messages.BLOCKED_MESSAGES_HIDE",
            predicate: () => settings.store.hideBlockedMessages,
            replacement: {
                match: /let\{[^}]*collapsedReason[^}]*}/,
                replace: "return null;$&",
            },
        },
        ...[
            // Ignore new messages from blocked users
            "displayName=\"MessageStore\"",
            // Don't mark channels unread because of blocked user messages
            "displayName=\"ReadStateStore\"",
        ].map(find => ({
            find,
            predicate: () => settings.store.ignoreBlockedMessages,
            replacement: {
                match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                replace: (_, props) => `if($self.isUserBlocked(${props}.message.id))return;`,
            },
        })),
        {
            // Hides the author of referenced messages in replies to them
            find: "isRepliedMessage:!!",
            predicate: () => settings.store.hideReferencedAuthor,
            replacement: {
                match: /function \i\(\i\){/,
                replace: (match) => `${match}if($self.isUserBlocked(arguments[0].message.author.id))return;`,
            },
        },
        {
            // Ignore all TYPING_START events from blocked users
            find: "displayName=\"TypingStore\"",
            predicate: () => settings.store.ignoreTyping,
            replacement: {
                match: /TYPING_START:(\i)/,
                replace: (_, func) => `TYPING_START:(e)=>{if($self.isUserBlocked(e.userId))return;${func}(e)}`,
            },
        },
        {
            // Hide blocked users from chat autocomplete
            find: ".GlobalMentionMode.ALLOW_EVERYONE_OR_HERE,",
            replacement: {
                match: /(queryResults.+?)(return{results:(\i))/,
                replace: (_, start, end, results) =>
                    `${start}${results}.users=${results}.users.filter(res=>!$self.isUserBlocked(res.user.id));console.log(${results});${end}`,
            },
        },
    ],
    settings,
    isUserBlocked: (userId: string) =>
        userId && RelationshipStore.isBlocked(userId),
});

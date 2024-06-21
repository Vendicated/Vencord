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
import { Logger } from "@utils/Logger";
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
            onChange: newValue => {
                if (!newValue) settings.store.ignoreBlockedMessages = false;
            },
        },
        ignoreBlockedMessages: {
            description: "Completely ignore incoming gateway messages from blocked users. (locally)",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
        ignoreTyping: {
            description: "Hide blocked users from the currently typing list in chat.",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
        hideReferencedAuthor: {
            description: "Hide blocked authors of referenced messages in replies.",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        },
        hideFromMemberList: {
            description: "Hide blocked users from the members list.",
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
    settings,
    patches: [
        // Based on canary bd584cf8aedd674f8d65c316892cf5054b7b6fd5
        {
            // Hide blocked message groups from non-DM channels
            find: ".MESSAGE_GROUP_BLOCKED||",
            replacement: {
                match: /(\i)\.type===(?:\i\.)+MESSAGE_GROUP_SPAMMER\)\{/,
                replace: "$& console.log(arguments);if($1.type === 'MESSAGE_GROUP_BLOCKED') return;",
            },
        },
        ...[
            // Ignore new messages from blocked users
            "\"MessageStore\"",
            // Don't mark channels unread because of blocked user messages
            "\"ReadStateStore\"",
        ].map(find => ({
            find,
            predicate: () => settings.store.ignoreBlockedMessages,
            replacement: {
                match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                replace: "if($self.isBlocked($1.message.id)) return;",
            },
        })),
        {
            // Hides the author of referenced messages in replies to them
            find: "isRepliedMessage:!!",
            predicate: () => settings.store.hideReferencedAuthor,
            replacement: {
                match: /function \i\(\i\){/,
                replace: "$& if($self.isBlocked(arguments[0].message.author.id)) return;",
            },
        },
        {
            // Ignore all TYPING_START events from blocked users
            find: "\"TypingStore\"",
            predicate: () => settings.store.ignoreTyping,
            replacement: {
                match: /TYPING_START:(\i)/,
                replace: "TYPING_START: (e) => { if($self.isBlocked(e.userId))return; $1(e) }",
            },
        },
        {
            // Hide blocked users from chat autocomplete
            find: ".ALLOW_EVERYONE_OR_HERE,",
            replacement: {
                match: /(queryResults.+?)return\{results:(.+?\))}/,
                replace:
                    "$1" +
                    "let results = $2;" +
                    "results.users=results.users.filter(res=>!$self.isBlocked(res.user.id));" +
                    "return { results }",
            },
        },
        {
            // Hide blocked users from the member list
            find: "this.props.channel.id&&this.updateSubscription(),this.trackMemberListViewed()",
            predicate: () => settings.store.hideFromMemberList,
            replacement: {
                match: /(memo\((\i)=>{)(let{colorRoleId)/,
                replace: "$1 if($self.isBlocked($2.user.id)) return; $3",
            },
        },
    ],
    isBlocked(userId: string) {
        try {
            return RelationshipStore.isBlocked(userId);
        } catch (e) {
            new Logger(this.name).error("Failed to check if user is blocked:", e);
        }
    }
});

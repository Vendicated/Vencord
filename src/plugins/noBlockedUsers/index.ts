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
        // Based on canary 70001c7d67fae9258eb77f27d7addd4a20b99fad
        {
            // Hide blocked message groups from non-DM channels
            find: "ChannelStreamTypes.MESSAGE_GROUP_BLOCKED||",
            replacement: {
                match: /map\(\((?<param>\i).+?ChannelStreamTypes.MESSAGE_GROUP_SPAMMER\)\{/,
                replace: "$& if(!arguments[0].channel.isDM() && $<param>.type === 'MESSAGE_GROUP_BLOCKED') return;",
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
                match: /(?<=MESSAGE_CREATE:function\((?<props>\i)\){)/,
                replace: "if($self.isBlocked($<props>.message.id)) return;",
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
            find: "displayName=\"TypingStore\"",
            predicate: () => settings.store.ignoreTyping,
            replacement: {
                match: /TYPING_START:(?<func>\i)/,
                replace: "TYPING_START: (e) => { if($self.isBlocked(e.userId))return; $<func>(e) }",
            },
        },
        {
            // Hide blocked users from chat autocomplete
            find: ".GlobalMentionMode.ALLOW_EVERYONE_OR_HERE,",
            replacement: {
                match: /(?<start>queryResults.+?)(?<end>return{results:(?<results>\i))/,
                replace: "$<start> $<results>.users=$<results>.users.filter(res=>!$self.isBlocked(res.user.id)); $<end>",
            },
        },
        {
            // Hide blocked users from the member list
            find: "this.props.channel.id&&this.updateSubscription(),this.trackMemberListViewed()",
            predicate: () => settings.store.hideFromMemberList,
            replacement: {
                match: /(?<start>memo\((?<param>\i)=>{)(?<end>let{colorRoleId)/,
                replace: "$<start> if($self.isBlocked($<param>.user.id)) return; $<end>",
            },
        },
    ],
    isBlocked: (userId: string) =>
        userId && RelationshipStore.isBlocked(userId),
});

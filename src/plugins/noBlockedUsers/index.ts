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

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { User } from "discord-types/general";

const RelationshipStore = findByPropsLazy("getRelationships", "isBlocked");

const settings = definePluginSettings(
    {
        hideBlockedMessages: {
            description: "Hide messages from blocked users",
            type: OptionType.BOOLEAN,
            default: true,
        },
        ignoreBlockedMessages: {
            description: "Ignore incoming gateway messages from blocked users (locally)",
            type: OptionType.BOOLEAN,
            default: true,
        },
        ignoreTyping: {
            description: "Hide blocked users from the currently typing list in chat",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
        hideReferencedAuthor: {
            description: "Hide blocked authors of referenced messages in replies",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
        hideFromMemberList: {
            description: "Hide blocked users from the members list",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
    },
);

migratePluginSettings("NoBlockedUsers", "NoBlockedMessages");

export default definePlugin({
    name: "NoBlockedUsers",
    description: "Hides blocked users and their messages from everywhere possible",
    authors: [Devs.rushii, Devs.Samu],
    settings,
    patches: [
        {
            // Hide blocked message groups from non-DM channels
            find: ".MESSAGE_GROUP_BLOCKED||",
            replacement: {
                match: /(\i)\.type===(?:\i\.)+MESSAGE_GROUP_SPAMMER\)\{/,
                replace: "$& if($1.type === 'MESSAGE_GROUP_BLOCKED' && $self.settings.store.hideBlockedMessages) return;",
            },
        },
        ...[
            // Ignore new messages from blocked users
            '"MessageStore"',
            // Don't mark channels unread because of blocked user messages
            '"ReadStateStore"',
        ].map(find => ({
            find,
            replacement: {
                match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                replace: "if($self.settings.store.ignoreBlockedMessages && $self.isBlocked($1.message?.author?.id)) return;",
            },
        })),
        {
            // Hides the author of referenced messages in replies to them
            find: "isRepliedMessage:!!",
            predicate: () => settings.store.hideReferencedAuthor,
            replacement: {
                match: /return null!=.+?SYSTEM_TAG/,
                replace: "if($self.isBlocked(arguments[0]?.message?.author?.id)) return; $&",
            },
        },
        {
            // Ignore all TYPING_START events from blocked users
            find: '"TypingStore"',
            predicate: () => settings.store.ignoreTyping,
            replacement: {
                match: /TYPING_START:(\i)/,
                replace: "TYPING_START: (event) => { if($self.isBlocked(event.userId))return; $1(event) }",
            },
        },
        {
            // Hide blocked users from chat autocomplete
            find: ".ALLOW_EVERYONE_OR_HERE,",
            replacement: {
                match: /(queryResults.+?)return\{results:(.+?\))}/,
                replace: "$1 return { results: $self.filterAutocompleteQuery($2) }",
            },
        },
        {
            // Hide blocked users from the member list
            find: "this.props.channel.id&&this.updateSubscription(),this.trackMemberListViewed()",
            predicate: () => settings.store.hideFromMemberList,
            replacement: {
                match: /(memo\((\i)=>{)(let{colorRoleId)/,
                replace: "$1 if($self.isBlocked($2?.user?.id)) return; $3",
            },
        },
    ],
    isBlocked(userId: string) {
        try {
            if (!userId) throw "userId is invalid";

            return RelationshipStore.isBlocked(userId);
        } catch (e) {
            new Logger(this.name).error("Failed to check if user is blocked:", e);
        }
    },
    filterAutocompleteQuery(results: { users: { user: User }[] }) {
        results.users = results?.users?.filter(item => !this.isBlocked(item?.user?.id));
        return results;
    },
});

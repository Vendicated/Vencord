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
import { getCurrentChannel } from "@utils/discord";
import { runtimeHashMessageKey } from "@utils/intlHash";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Channel, Message, User } from "@vencord/discord-types";
import { findComponentByCodeLazy } from "@webpack";
import { i18n,ReferencedMessageStore, RelationshipStore } from "@webpack/common";

interface MessageDeleteProps {
    // Internal intl message for BLOCKED_MESSAGE_COUNT
    collapsedReason: () => any;
    messages: {
        content: {
            messageReference: Message | null;
        }[];
    };
}

type MemberListProps =
    | {
        children: {
            key: string,
            props: {
                user: User;
            };
        }[],
        channel?: never;
    }
    | {
        children?: never,
        channel: Channel;
    };

// Remove this migration once enough time has passed
migratePluginSetting("NoBlockedMessages", "ignoreBlockedMessages", "ignoreMessages");
const settings = definePluginSettings({
    ignoreMessages: {
        description: "Completely ignores incoming messages from blocked and ignored (if enabled) users",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    hideFromMembersList: {
        description: "Completely hides blocked and ignored (if enabled) users from members list",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    hideReplies: {
        description: "Completely hides incoming messages to blocked and ignored (if enabled) users",
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

export default definePlugin({
    name: "HideBlockedUsers",
    description: "Hides all blocked/ignored users from Discord completely",
    authors: [Devs.rushii, Devs.Samu, Devs.jamesbt365, Devs.imnotplayinginreallife],
    tags: ["Accessibility", "Chat"],
    settings,

    patches: [
        {
            find: ".__invalid_blocked,",
            replacement: [
                {
                    match: /let{messages:\i,[^}]*?collapsedReason[^}]*}/,
                    replace: "if($self.shouldHide(arguments[0]))return null;$&"
                }
            ]
        },
        {
            find: '"MessageStore"',
            predicate: () => settings.store.ignoreMessages,
            replacement: [
                {
                    match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                    replace: (_, props) => `if($self.shouldIgnoreMessage(${props}.message))return;`
                }
            ]
        },
        {
            find: '"ReadStateStore"',
            predicate: () => settings.store.ignoreMessages,
            replacement: [
                {
                    match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                    replace: (_, props) => `if($self.shouldIgnoreMessage(${props}.message))return;`
                }
            ]
        },
        {
            find: /,disableAnimationTracking\(\)/,
            predicate: () => settings.store.hideFromMembersList,
            replacement: [
                {
                    match: /let{containerRef:\i,children:\i,themeOptions:\i}=\i/,
                    replace: "$self.hideBlockedUsersFromMembersList(arguments);$&"
                }
            ]
        },
        {
            find: /\.MEMBER_LIST\)/,
            predicate: () => settings.store.hideFromMembersList,
            replacement: [
                {
                    match: /let{channel:\i}=\i,\i=\i\i\.default/,
                    replace: "$self.hideBlockedUsersFromMembersList(arguments);$&"
                }
            ]
        },
        {
            find: ".THREAD_STARTER_MESSAGE,\"",
            predicate: () => settings.store.hideReplies,
            replacement: {
                match: /return null!=\i\i/,
                replace: "if($self.shouldIgnoreUser(arguments[0].message.author.id, arguments[0].message.messageReference?.message_id, arguments[0].message.messageReference?.channel_id)) return null; $&"
            }
        },
        {
            find: /let{threadId:\i,goToThread:\i,observePostVisibilityAnalytics:\i,overrideMedia:\i,className:\i,containerWidth:\i/,
            replacement: {
                match: /({channel:(\i).+?\i.\i\);)(\i)/,
                replace: "$1if ($self.shouldIgnoreUser($2.ownerId)) {return null};$3"
            }
        }
    ],

    shouldIgnoreUser(userId: string, referenceMessageId?: string, referenceMessageChannelId?: string) {
        try {
            findComponentByCodeLazy("let{threadId:t,goToThread:n,observePostVisibilityAnalytics:i,overrideMedia:r,className:d,containerWidth:o}=e");
            if (referenceMessageId && referenceMessageChannelId) {
                const referencedMessage = ReferencedMessageStore.getMessage(referenceMessageChannelId, referenceMessageId).message;
                if (!referencedMessage) return false;
                return (settings.store.hideReplies && referencedMessage.blocked) || (settings.store.hideReplies && referencedMessage.ignored);
            }
            return RelationshipStore.isBlocked(userId) || (settings.store.applyToIgnoredUsers && RelationshipStore.isIgnored(userId));
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if user is blocked or ignored:", e);
            return false;
        }
    },

    shouldIgnoreMessage(message: Message) {
        if (message.messageReference) {
            return this.shouldIgnoreUser(message?.author?.id, message.messageReference.message_id, message.messageReference.channel_id);
        }
        return this.shouldIgnoreUser(message?.author?.id);
    },

    shouldHide(props: MessageDeleteProps): boolean {
        try {
            const collapsedReason = props.collapsedReason();
            const is = (key: string) => collapsedReason === i18n.t[runtimeHashMessageKey(key)]();

            return is("BLOCKED_MESSAGE_COUNT") || (settings.store.applyToIgnoredUsers && is("IGNORED_MESSAGE_COUNT"));
        } catch (e) {
            new Logger("NoBlockedMessages").error("Failed to check if message should be hidden:", e);
            return false;
        }
    },

    hideBlockedUsersFromMembersList(args: MemberListProps[]) {
        try {
            const members = args[0].children ?? args[0].channel.recipients;
            if (Array.isArray(members)) {
                const blockedUsersIds: number[] = members.map(child => {
                    if (child != null && child.key?.startsWith("member") && this.shouldIgnoreUser(child?.props?.user?.id)) {
                        return Number(child.props.user.id);
                    }
                    if (getCurrentChannel()?.isGroupDM() && this.shouldIgnoreUser(child)) {
                        return Number(child);
                    }
                }).filter(blockedUserId => blockedUserId != null);
                if (members.length > 0) {
                    const currentChannel = getCurrentChannel();
                    if (currentChannel) {
                        if (currentChannel.isGroupDM() && args[0].channel) {
                            args[0].channel.recipients = args[0].channel.recipients.filter(userId => !blockedUsersIds.includes(Number(userId)));
                        } else if (args[0].children) {
                            args[0].children = args[0].children.filter(child => !blockedUsersIds.includes(Number(child?.props?.user?.id)));
                        }
                    }
                }
            }
        } catch (e) {
            new Logger("NoBlockedMessages").error(`Failed to hide blocked users from member list: ${e}`);
        }
    }
});

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
import { sleep } from "@utils/misc";
import { Queue } from "@utils/Queue";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Channel, CustomEmoji, Message, ReactionEmoji, User } from "@vencord/discord-types";
import { Constants, FluxDispatcher, i18n, ReferencedMessageStore, RelationshipStore, RestAPI, useEffect } from "@webpack/common";

interface MessageDeleteProps {
    // Internal intl message for BLOCKED_MESSAGE_COUNT
    collapsedReason: () => any;
    messages: {
        content: {
            messageReference: Message | null;
        }[];
    };
}

interface ReactionCacheEntry {
    fetched: boolean;
    users: Map<string, User>;
}

interface ReactionProps {
    message: Message;
    emoji: CustomEmoji;
    type: number;
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

const queue = new Queue();
let reactions: Record<string, ReactionCacheEntry> = {};

function fetchReactions(msg: Message, emoji: ReactionEmoji, type: number) {
    const key = emoji.name + (emoji.id ? `:${emoji.id}` : "");
    return RestAPI.get({
        url: Constants.Endpoints.REACTIONS(msg.channel_id, msg.id, key),
        query: {
            limit: 100,
            type
        },
        oldFormErrors: true
    })
        .then(res => {
            for (const user of res.body) {
                FluxDispatcher.dispatch({
                    type: "USER_UPDATE",
                    user
                });
            }

            FluxDispatcher.dispatch({
                type: "MESSAGE_REACTION_ADD_USERS",
                channelId: msg.channel_id,
                messageId: msg.id,
                users: res.body,
                emoji,
                reactionType: type
            });
        })
        .catch(console.error)
        .finally(() => sleep(250));
}

function getReactionsWithQueue(msg: Message, e: ReactionEmoji, type: number) {
    const key = `${msg.id}:${e.name}:${e.id ?? ""}:${type}`;
    const cache = reactions[key] ??= { fetched: false, users: new Map() };
    if (!cache.fetched) {
        queue.unshift(() => fetchReactions(msg, e, type));
        cache.fetched = true;
    }

    return cache.users;
}

// Remove this migration once enough time has passed
migratePluginSetting("HideBlockedUsers", "ignoreBlockedMessages", "ignoreMessages");
const settings = definePluginSettings({
    hideReactions: {
        description: "Hides reactions by blocked and ignored (if enabled) users",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    hideFromMembersList: {
        description: "Hides blocked and ignored (if enabled) users from the members list",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    hideReplies: {
        description: "Hides replies to messages by blocked and ignored (if enabled) users",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    ignoreMessages: {
        description: "Completely ignores incoming messages from blocked and ignored (if enabled) users",
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
    description: "Completely hide all blocked/ignored users in Discord",
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
            find: '"MessageReactionsStore"',
            replacement: {
                match: /CONNECTION_OPEN:function\(\){(\i)={}/,
                replace: "$&;$self.reactions=$1;"
            }
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
        },
        {
            find: /\i\i.\i.EMOJI_IN_BURST_REACTION_HOVER:\i\i.\i.EMOJI_IN_BURST_REACTION_HOVER_UPSELL/,
            replacement: {
                match: /return\(0,\i.jsx\)\(\i.\i,{ta/,
                predicate: () => settings.store.hideReactions,
                replace: "if($self.shouldHideReaction({message: arguments[0].message, emoji: arguments[0].emoji, type: arguments[0].type})) return null;$&"
            }
        }
    ],

    shouldHideReaction({ message, emoji, type }: ReactionProps) {
        try {
            const forceUpdate = useForceUpdater();

            useEffect(() => {
                const cb = (e: any) => {
                    if (e?.messageId === message.id)
                        forceUpdate();
                };
                FluxDispatcher.subscribe("MESSAGE_REACTION_ADD_USERS", cb);

                return () => FluxDispatcher.unsubscribe("MESSAGE_REACTION_ADD_USERS", cb);
            }, [message.id, forceUpdate]);

            if (message.reactions.length > 10) return false;

            const reactionMap = getReactionsWithQueue(message, emoji, type);
            const usersIds = reactionMap.keys().map(userId => {
                if (this.shouldIgnoreUser(userId)) {
                    return null;
                }

                return userId;
            }).toArray().filter(userId => userId != null);

            if (usersIds.length === 0) {
                return true;
            } else {
                return false;
            }
        } catch (e) {
            new Logger("HideBlockedUsers").error("Failed to check if reaction should be hidden:", e);
            return false;
        }
    },

    shouldIgnoreUser(userId: string, referenceMessageId?: string, referenceMessageChannelId?: string) {
        try {
            if (referenceMessageId && referenceMessageChannelId) {
                const referencedMessage = ReferencedMessageStore.getMessage(referenceMessageChannelId, referenceMessageId).message;
                if (!referencedMessage) return false;
                return (settings.store.hideReplies && referencedMessage.blocked) || (settings.store.hideReplies && referencedMessage.ignored);
            }
            return RelationshipStore.isBlocked(userId) || (settings.store.applyToIgnoredUsers && RelationshipStore.isIgnored(userId));
        } catch (e) {
            new Logger("HideBlockedUsers").error("Failed to check if user is blocked or ignored:", e);
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
            new Logger("HideBlockedUsers").error("Failed to check if message should be hidden:", e);
            return false;
        }
    },

    hideBlockedUsersFromMembersList(args: MemberListProps[]) {
        try {
            const members = args[0].children ?? args[0].channel.recipients;
            if (Array.isArray(members)) {
                const currentChannel = getCurrentChannel();
                if (currentChannel) {
                    const blockedUsersIds: string[] = members.map(child => {
                        if (child != null && child.key?.startsWith("member") && this.shouldIgnoreUser(child?.props?.user?.id)) {
                            return child.props.user.id;
                        }
                        if (currentChannel.isGroupDM() && this.shouldIgnoreUser(child)) {
                            return child;
                        }
                    }).filter(blockedUserId => blockedUserId != null);
                    if (members.length > 0) {
                        if (currentChannel.isGroupDM() && args[0].channel) {
                            args[0].channel.recipients = args[0].channel.recipients.filter(userId => !blockedUsersIds.includes(userId));
                        } else if (args[0].children) {
                            args[0].children = args[0].children.filter(child => !blockedUsersIds.includes(child?.props?.user?.id));
                        }
                    }
                }
            }
        } catch (e) {
            new Logger("HideBlockedUsers").error(`Failed to hide blocked users from member list: ${e}`);
        }
    },

    set reactions(value: any) {
        reactions = value;
    }
});

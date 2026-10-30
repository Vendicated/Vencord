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
import { getCurrentChannel } from "@utils/discord";
import { runtimeHashMessageKey } from "@utils/intlHash";
import { Logger } from "@utils/Logger";
import { sleep } from "@utils/misc";
import { Queue } from "@utils/Queue";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Channel, CustomEmoji, Message, ReactionEmoji, User } from "@vencord/discord-types";
import { MessageFlags } from "@vencord/discord-types/enums";
import { Constants, FluxDispatcher, i18n, ReferencedMessageStore, RelationshipStore, RestAPI, useEffect, UserSettingsProtoStore, VoiceStateStore } from "@webpack/common";

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
    count: number;
}

type MemberListProps =
    | {
        children: {
            key: string,
            props: {
                user: User;
                type: string;
            };
        }[],
        channel?: never;
    }
    | {
        children?: never,
        channel: Channel;
    };

const MESSAGE_GROUP_WINDOW_MS = 420000;
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
    hideFromVoiceChannels: {
        description: "Hides blocked and ignored (if enabled) users from the voice channels",
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
                replace: "if($self.shouldHideReaction({message: arguments[0].message, emoji: arguments[0].emoji, type: arguments[0].type, count: arguments[0].count})) return null;$&"
            }
        },
        {
            find: ".MESSAGE_GROUP_BLOCKED||",
            replacement: {
                match: /let \i,\i,\i,\i,{className:\i,/,
                replace: "$self.hideBlockedMessages(arguments);$&"
            }
        },
        {
            find: "VoiceDareAvatarRing",
            replacement: {
                match: /let{children:\i,collapsed:\i=!1,className:\i}/,
                replace: "$self.hideBlockedUsersFromVoicePreview(arguments);$&"
            }
        },
        {
            find: /\){let{participants:\i,onClick/,
            replacement: {
                match: /let{participants/,
                replace: "arguments[0].participants = $self.hideVoiceParticipants(arguments[0].participants);$&"
            }
        }
    ],

    flux: {
        VOICE_CHANNEL_SELECT: ({ channelId }) => {
            if (!settings.store.hideFromVoiceChannels) return;
            const voiceStates = VoiceStateStore.getVoiceStatesForChannel(channelId);
            for (const userId in voiceStates) {
                if (RelationshipStore.isBlocked(userId) || (settings.store.applyToIgnoredUsers && RelationshipStore.isIgnored(userId))) {
                    const protoSettings = UserSettingsProtoStore.settings;
                    const mutedConfig = {
                        "muted": true,
                        "volume": 100,
                        "modifiedAt": new Date().getTime().toString(),
                        "soundboardMuted": false
                    };
                    Object.defineProperty(protoSettings.audioContextSettings.user, userId, { value: mutedConfig, writable: true, configurable: true, enumerable: true });
                    FluxDispatcher.dispatch({
                        type: "USER_SETTINGS_PROTO_UPDATE",
                        settings: {
                            proto: protoSettings,
                            type: 1
                        },
                        partial: false
                    });
                }
            }
        }
    },

    hideBlockedUsersFromVoicePreview(args) {
        const connectedVoiceUsers: Array<{ props: { user: User; }; }> = args[0].children[0];
        args[0].children[0] = connectedVoiceUsers.filter(user => !user.props?.user || !this.shouldIgnoreUser(user.props.user.id));
    },

    hideVoiceParticipants(participants: { user: User; }[]) {
        return participants.filter(voiceParticipant => !this.shouldIgnoreUser(voiceParticipant.user.id));
    },

    hideBlockedMessages(args) {
        if (!args[0]) return;
        const chatComponents: Array<any> = args[0].channelStream;
        args[0].channelStream = chatComponents.filter(chatComponent => chatComponent.type !== "MESSAGE_GROUP_BLOCKED");
        const messages: Array<{ content: Message, groupId: string; }> = chatComponents.filter(component => component.type === "MESSAGE");
        messages.forEach((messageObject, i) => {
            if (settings.store.hideReplies && this.shouldIgnoreUser(messageObject.content.author.id, messageObject.content.messageReference?.message_id, messageObject.content.messageReference?.channel_id)) {
                args[0].channelStream.splice(args[0].channelStream.indexOf(messageObject), 1);
            }

            const previousMessage = messages.at(i - 1);
            if (previousMessage && i !== 0 && !messageObject.content.hasFlag(MessageFlags.HAS_THREAD) && !messageObject.content.interaction) {
                const previuosSiblingDate = new Date(previousMessage.content.timestamp);
                const currentMessageDate = new Date(messageObject.content.timestamp);
                if (previousMessage.content.author.id === messageObject.content.author.id && previousMessage.groupId !== messageObject.groupId && (currentMessageDate.getTime() - previuosSiblingDate.getTime() <= MESSAGE_GROUP_WINDOW_MS)) {
                    messageObject.groupId = previousMessage.groupId;
                }
            }
        });

        const dividers: Array<{ type: string; }> = chatComponents.filter(component => component.type === "DIVIDER");
        dividers.forEach(dividerObject => {
            const dividerIndex = args[0].channelStream.indexOf(dividerObject);
            const previousDivider = args[0].channelStream.at(dividerIndex - 1);
            if (previousDivider && previousDivider.type === "DIVIDER") {
                args[0].channelStream.splice(dividerIndex - 1, 1);
            }

            if (dividerIndex === 0) {
                args[0].channelStream.splice(dividerIndex, 1);
            }
        });
    },

    shouldHideVoiceParticipant(userId: string) {
        return this.shouldIgnoreUser(userId);
    },

    shouldHideReaction({ message, emoji, type, count }: ReactionProps) {
        try {
            if (count > 10) return false;

            const forceUpdate = useForceUpdater();

            useEffect(() => {
                const cb = (e: any) => {
                    if (e?.messageId === message.id)
                        forceUpdate();
                };
                FluxDispatcher.subscribe("MESSAGE_REACTION_ADD_USERS", cb);

                return () => FluxDispatcher.unsubscribe("MESSAGE_REACTION_ADD_USERS", cb);
            }, [message.id, forceUpdate]);

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
            const membersListComponents = args[0].children ?? args[0].channel.recipients;

            if (Array.isArray(membersListComponents)) {
                const currentChannel = getCurrentChannel();
                const isGroupDM = currentChannel?.isGroupDM();

                if (currentChannel) {
                    const blockedUsersIds: string[] = membersListComponents.map(component => {
                        if (component != null && component.key?.startsWith("member") && this.shouldIgnoreUser(component?.props?.user?.id)) {
                            return component.props.user.id;
                        }
                        if (isGroupDM && this.shouldIgnoreUser(component)) {
                            return component;
                        }
                    }).filter(blockedUserId => blockedUserId != null);

                    if (membersListComponents.length > 0) {
                        if (isGroupDM && args[0].channel) {
                            args[0].channel.recipients = args[0].channel.recipients.filter(userId => !blockedUsersIds.includes(userId));
                        } else if (args[0].children) {
                            args[0].children = args[0].children.filter(child => !blockedUsersIds.includes(child?.props?.user?.id));
                            args[0].children.forEach((component, i, components) => {
                                const previousComponent = components.at(i - 1);
                                if (previousComponent && previousComponent.props.type === "GROUP" && component.props.type === "GROUP") {
                                    args[0].children?.splice(i - 1, 1);
                                }
                            });
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

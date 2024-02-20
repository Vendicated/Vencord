/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { humanFriendlyJoin } from "@utils/text";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, MessageActions, MessageStore, RelationshipStore, UserStore } from "@webpack/common";
import { Message, User } from "discord-types/general";

const MessageCreator = findByPropsLazy("createBotMessage");
const SortedVoiceStateStore = findByPropsLazy("getVoiceStatesForChannel");

const settings = definePluginSettings({
    friendDirectMessages: {
        type: OptionType.BOOLEAN,
        description: "Recieve notifications in your friend's DMs when they join a voice channel",
        default: true
    },
    friendDirectMessagesShowMembers: {
        type: OptionType.BOOLEAN,
        description: "Show a list of other members in the voice channel when recieving a DM notification of your friend joining a voice channel",
        default: true
    },
    friendDirectMessagesShowMemberCount: {
        type: OptionType.BOOLEAN,
        description: "Show the count of other members in the voice channel when recieving a DM notification of your friend joining a voice channel",
        default: false
    },
    voiceChannel: {
        type: OptionType.BOOLEAN,
        description: "Recieve messages in the voice channels directly",
        default: true
    },
    voiceChannelChatSelf: {
        type: OptionType.BOOLEAN,
        description: "Log your own voice channel events in the voice channels",
        default: true
    },
    voiceChannelChatSilent: {
        type: OptionType.BOOLEAN,
        description: "Join/leave/move messages in voice channel chats will be silent",
        default: true
    },
    ignoreBlockedUsers: {
        type: OptionType.BOOLEAN,
        description: "Do not send messages about blocked users joining/leaving/moving voice channels",
        default: true
    },
});

interface VoiceState {
    guildId?: string;
    channelId?: string;
    oldChannelId?: string;
    user: User;
    userId: string;
}

function getMessageFlags(isDM: boolean) {
    let flags = 1 << 6;
    if (settings.store.voiceChannelChatSilent && isDM) flags += 1 << 12;
    return flags;
}

function sendVoiceStatusMessage(channelId: string, content: string, userId: string, isDM: boolean): Message {
    const message: Message = MessageCreator.createBotMessage({ channelId, content, embeds: [] });
    message.flags = getMessageFlags(isDM);
    message.author = UserStore.getUser(userId);
    // If we try to send a message into an unloaded channel, the client-sided messages get overwritten when the channel gets loaded
    // This might be messy but It Works:tm:
    const messagesLoaded: Promise<any> = MessageStore.hasPresent(channelId) ? new Promise<void>(r => r()) : MessageActions.fetchMessages({ channelId });
    messagesLoaded.then(() => {
        FluxDispatcher.dispatch({
            type: "MESSAGE_CREATE",
            channelId,
            message,
            optimistic: true,
            sendMessageOptions: {},
            isPushNotification: false
        });
    });
    return message;
}

// Blatantly stolen from VcNarrator plugin

// For every user, channelId and oldChannelId will differ when moving channel.
// Only for the local user, channelId and oldChannelId will be the same when moving channel,
// for some ungodly reason
let clientOldChannelId: string | undefined;

export default definePlugin({
    name: "VoiceJoinMessages",
    description: "Recieve client-side ephemeral messages when your friends join voice channels",
    authors: [Devs.Sqaaakoi],
    settings,
    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            if (!voiceStates) return;
            const clientUserId = UserStore.getCurrentUser().id;
            voiceStates.forEach(state => {
                // mmmm hacky workaround
                const { userId, channelId } = state;
                let { oldChannelId } = state;
                if (userId === clientUserId && channelId !== clientOldChannelId) {
                    oldChannelId = clientOldChannelId;
                    clientOldChannelId = channelId;
                }
                if (settings.store.ignoreBlockedUsers && RelationshipStore.isBlocked(userId)) return;
                // Ignore events from same channel
                if (oldChannelId === channelId) return;

                // Friend joined a voice channel
                if (settings.store.friendDirectMessages && (!oldChannelId && channelId) && userId !== clientUserId && RelationshipStore.isFriend(userId)) {
                    let memberListContent = "";
                    if (settings.store.friendDirectMessagesShowMembers || settings.store.friendDirectMessagesShowMemberCount) {
                        const sortedVoiceStates: [{ user: { id: string; }; }] = SortedVoiceStateStore.getVoiceStatesForChannel(ChannelStore.getChannel(channelId));
                        const otherMembers = sortedVoiceStates.filter(s => s.user.id !== userId).length;
                        if (otherMembers <= 0) {
                            memberListContent += ", nobody else is in the voice channel";
                        } else if (settings.store.friendDirectMessagesShowMemberCount) {
                            memberListContent += ` with ${otherMembers} other member${otherMembers === 1 ? "s" : ""}`;
                        }
                        if (settings.store.friendDirectMessagesShowMembers && otherMembers > 0) {
                            memberListContent += settings.store.friendDirectMessagesShowMemberCount ? ", " : " with ";
                            memberListContent += humanFriendlyJoin(sortedVoiceStates.map(s => `<@${s.user.id}>`));
                        }
                    }
                    const dmChannelId = ChannelStore.getDMFromUserId(userId);
                    if (dmChannelId) sendVoiceStatusMessage(dmChannelId, `Joined voice channel <#${channelId}>${memberListContent}`, userId, true);
                }

                if (settings.store.voiceChannel) {
                    if (!settings.store.voiceChannelChatSelf && userId === clientUserId) return;
                    // Join / Leave
                    if ((!oldChannelId && channelId) || (oldChannelId && !channelId)) {
                        // empty string is to make type checker shut up
                        const targetChannelId = oldChannelId || channelId || "";
                        sendVoiceStatusMessage(targetChannelId, `${(channelId ? "Joined" : "Left")} <#${targetChannelId}>`, userId, false);
                    }
                    // Move between channels
                    if (oldChannelId && channelId) {
                        sendVoiceStatusMessage(oldChannelId, `Moved to <#${channelId}>`, userId, false);
                        sendVoiceStatusMessage(channelId, `Moved from <#${oldChannelId}>`, userId, false);
                    }
                }

            });
        },
    },
    patches: [
        // Join messages
        // case m.MessageTypes.RECIPIENT_ADD: if(null== M)return; return (0, s.astToString)(N.default.Messages.SYSTEM_MESSAGE_RECIPIENT_ADD.astFormat({ username: R, usernameOnClick: m.NOOP, otherUsername: T.default.getName(null, O, M), otherUsernameOnClick: m.NOOP }));
        // {
        //     find: "MessageTypes.RECIPIENT_ADD: ",
        //     replacement: {
        //         match: /(\w+)if\(null== \i\)return;d/,
        //         // match: /\.name\),.{0,120}\.children.+?:null(?<=,channel:(\i).+?)/,
        //         replace: "$&,$self.TypingIndicator($1.id)"
        //     }
        // },
    ],
    // getMessageFlags,
    // sendVoiceStatusMessage
});

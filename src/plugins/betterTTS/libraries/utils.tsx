/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageJSON } from "@vencord/discord-types";
import { showToast } from "@webpack/common";

import settings from "../settings";
import { ChannelStore, GuildMemberStore, GuildStore, MediaEngineStore, RelationshipStore, RTCConnectionStore, SelectedChannelStore, SelectedGuildStore, UserGuildSettingsStore, UserStore } from "../stores";

type ExtendedMessageJSON = MessageJSON & { prependGuildChannel?: boolean; };

let usersBlocked = new Set<string>();
let usersIgnored = new Set<string>();
let usersFriends = new Set<string>();

export function updateRelationships() {
    usersBlocked = new Set(RelationshipStore.getBlockedIDs());
    usersIgnored = new Set(RelationshipStore.getIgnoredIDs());
    usersFriends = new Set(RelationshipStore.getFriendIDs());
}

function isConnected() {
    const channelId = SelectedChannelStore.getVoiceChannelId();
    return channelId !== null;
}

export function shouldIgnoreWhenConnected(source) {
    if (!isConnected()) return false;
    switch (settings.store.ignoreWhenConnected) {
        case "none":
            return false;
        case "subscribed":
            return settings.store.ignoreWhenConnected === source;
        case "focusedConnected":
            return settings.store.ignoreWhenConnected === source;
        case "all":
            return true;
        default:
            break;
    }
    return false;
}

// Message evaluation
export function shouldPlayMessage(message: ExtendedMessageJSON) {
    const isSelfDeaf = MediaEngineStore.isSelfDeaf();
    if (isSelfDeaf || message.state === "SENDING" || message.content === "")
        return false;

    const messageAuthorId = message.author.id;
    const messageChannelId = message.channel_id;
    const messageGuildId = message.guild_id;

    const userId = UserStore.getCurrentUser().id;
    const focusedChannel = SelectedChannelStore.getCurrentlySelectedChannelId();
    const connectedChannel = RTCConnectionStore.getChannelId();
    const focusedGuild = SelectedGuildStore.getGuildId();
    const connectedGuild = RTCConnectionStore.getGuildId();

    const mutedChannels = UserGuildSettingsStore.getMutedChannels(messageGuildId);
    const mutedGuilds = UserGuildSettingsStore.isMuted(messageGuildId);

    if (settings.store.mutedUsers.includes(messageAuthorId)
        || settings.store.blockBlockedUsers && usersBlocked.has(messageAuthorId)
        || settings.store.blockIgnoredUsers && usersIgnored.has(messageAuthorId)
        || settings.store.blockNotFriendusers && !usersFriends.has(messageAuthorId)
        || settings.store.blockMutedChannels && mutedChannels.has(messageChannelId)
        || settings.store.blockMutedGuilds && mutedGuilds) {
        return false;
    }
    if (message.tts) { // command /tts
        message.prependGuildChannel = false;
        return true;
    }
    if (messageAuthorId === userId) {
        return false;
    }

    message.prependGuildChannel = settings.store.channelInfoReading === "focusedConnected" || settings.store.channelInfoReading === "all";
    switch (settings.store.messagesChannelsToRead) {
        case "never":
            break;
        case "allChannels":
            return true;
        case "focusedChannel":
            return messageChannelId === focusedChannel && !shouldIgnoreWhenConnected("focusedConnected");
        case "connectedChannel":
            return messageChannelId === connectedChannel && !shouldIgnoreWhenConnected("focusedConnected");
        case "focusedGuildChannels":
            return messageGuildId === focusedGuild && !shouldIgnoreWhenConnected("focusedConnected");
        case "connectedGuildChannels":
            return messageGuildId === connectedGuild && !shouldIgnoreWhenConnected("focusedConnected");
        default:
            break;
    }
    if (settings.store.subscribedChannels.includes(messageChannelId) || (messageGuildId && settings.store.subscribedGuilds.includes(messageGuildId))) {
        message.prependGuildChannel = settings.store.channelInfoReading === "subscribed" || settings.store.channelInfoReading === "all";
        return true && !shouldIgnoreWhenConnected("subscribed");
    }

    return false;
}

export function getUserName(userId, guildId) {
    const user = UserStore.getUser(userId);
    switch (settings.store.messageNamesReading) {
        case "userName":
            return user.username;
        case "globalName":
            return user.globalName ?? user.username;
        case "friendName":
            return RelationshipStore.getNickname(userId) ?? user.globalName ?? user.username;
        case "serverName":
            return GuildMemberStore.getNick(guildId, userId) ?? user.globalName ?? user.username;
        default:
            if (guildId) {
                return GuildMemberStore.getNick(guildId, userId) ?? user.globalName ?? user.username;
            } else {
                return RelationshipStore.getNickname(userId) ?? user.globalName ?? user.username;
            }
    }
}

export function getPatchedContent(message: ExtendedMessageJSON, guildId: string | undefined) {
    let text = message.content
        .replace(/<@!?(\d+)>/g, (match, userId) => getUserName(userId, guildId))
        .replace(/<@&?(\d+)>/g, (match, roleId) => GuildStore.getRoles(guildId)[roleId]?.name)
        .replace(/<#(\d+)>/g, (match, channelId) => ChannelStore.getChannel(channelId)?.name)
        .replace(/<a?:(\w+):(\d+)>/g, (match, emojiName) => "Emoji " + emojiName)
        .replace(/\|\|([^|]+)\|\|/g, (match, content) => settings.store.messageSpoilersReading ? content : "Spoiler")
        .replace(/https?:\/\/[^\s]+/g, url => {
            switch (settings.store.messageLinksReading) {
                case "remove":
                    return "";
                case "domain":
                    const domain = new URL(url).hostname;
                    return domain;
                case "sobstitute":
                    return "URL";
                case "keep":
                    return url;
                default:
                    return url;
            }
        });
    for (const rule of settings.store.textReplacerRules) {
        const parts = /\/(.*)\/(.*)/.exec(rule.regex);
        let regex: RegExp | null = null;
        if (regex == null) {
            regex = new RegExp(rule.regex);
        } else if (parts && parts[1] !== undefined && parts[2] !== undefined) {
            regex = new RegExp(parts[1], parts[2]);
        } else {
            regex = new RegExp(rule.regex);
        }
        text = text.replace(regex, rule.replacement);
    }
    if (text === "") return "";
    let toRead = "";
    if (settings.store.messagePrependChannel || settings.store.messagePrependGuild || settings.store.messagePrependNames) {
        if (settings.store.messagePrependNames) {
            const username = getUserName(message.author.id, guildId);
            toRead += `${username} `;
        }
        if ((settings.store.messagePrependGuild || settings.store.messagePrependChannel) && message.prependGuildChannel) {
            toRead += "in ";
            if (settings.store.messagePrependGuild) {
                const guild = GuildStore.getGuild(guildId);
                toRead += `${guild?.name} `;
            }
            if (settings.store.messagePrependChannel) {
                const channel = ChannelStore.getChannel(message.channel_id);
                toRead += `${channel?.name} `;
            }
        }
        toRead += `said ${text}`;
    } else {
        toRead += text;
    }
    return toRead;
}

let keyShortcut = {
    key: "",
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
};

export function updateToggleKeys(keys: string[]) {
    if (keys && keys.length === 0) {
        return;
    } else {
        keyShortcut = {
            key: "",
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
        };
    }
    for (const key in keys) {
        switch (keys[key]) {
            case "Control":
                keyShortcut.ctrlKey = true;
                break;
            case "Shift":
                keyShortcut.shiftKey = true;
                break;
            case "Alt":
                keyShortcut.altKey = true;
                break;
            default:
                keyShortcut.key = keys[key];
                break;
        }
    }
}

export function onKeyDown(event) {
    if (keyShortcut
        && event.ctrlKey === keyShortcut.ctrlKey
        && event.shiftKey === keyShortcut.shiftKey
        && event.altKey === keyShortcut.altKey
        && event.key === keyShortcut.key) {
        toggleTTS();
    }
}

function toggleTTS() {
    if (settings.store.enableTts) {
        showToast("TTS Muted 🔇");
    } else {
        showToast("TTS Enabled 🔊");
    }
    settings.store.enableTts = !settings.store.enableTts;
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { MessageActions, UserStore } from "@webpack/common";

const lastMessageIds: Map<string, string> = new Map();
const userCooldowns: Map<string, number> = new Map();
const channelCooldowns: Map<string, number> = new Map();
const processedMessageIds: Map<string, number> = new Map();
const sentReplyTimestamps: number[] = [];
const invalidRegexCache: Set<string> = new Set();
const pendingTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();
const PROCESSED_MESSAGE_TTL_MS = 5 * 60_000;
const MAX_PROCESSED_MESSAGE_IDS = 10_000;
const MAX_DISCORD_MESSAGE_LENGTH = 2_000;
let isPluginRunning = false;

function parseLines(value: string): string[] {
    return value
        .split(/\r?\n/)
        .map(part => part.trim())
        .filter(Boolean);
}

function parseIds(value: string): Set<string> {
    return new Set(
        value
            .split(/[,\s]+/)
            .map(part => part.trim())
            .filter(Boolean)
    );
}

function pickRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

function toRegex(triggerPrefix: string, caseInsensitive: boolean): RegExp | null {
    const literalMatch = triggerPrefix.match(/^\/(.+)\/([a-z]*)$/);

    try {
        if (literalMatch) {
            const [, pattern, rawFlags] = literalMatch;
            const flags = caseInsensitive && !rawFlags.includes("i")
                ? `${rawFlags}i`
                : rawFlags;

            return new RegExp(pattern, flags);
        }

        return new RegExp(triggerPrefix, caseInsensitive ? "i" : undefined);
    } catch (error) {
        if (!invalidRegexCache.has(triggerPrefix)) {
            console.warn("[AutoReplyContent] Invalid regex trigger:", triggerPrefix, error);
            invalidRegexCache.add(triggerPrefix);
        }
        return null;
    }
}

function matchesTrigger(content: string, triggerPrefix: string, useRegex: boolean, exactMatch: boolean, caseInsensitive: boolean): boolean {
    if (useRegex) {
        const regex = toRegex(triggerPrefix, caseInsensitive);
        return regex ? regex.test(content) : false;
    }

    if (caseInsensitive) {
        const normalizedContent = content.toLowerCase();
        const normalizedTrigger = triggerPrefix.toLowerCase();
        return exactMatch
            ? normalizedContent === normalizedTrigger
            : normalizedContent.startsWith(normalizedTrigger);
    }

    return exactMatch
        ? content === triggerPrefix
        : content.startsWith(triggerPrefix);
}

function getResponseCandidates(responseMessage: string, responseMessages: string): string[] {
    const listMessages = parseLines(responseMessages);
    if (listMessages.length > 0) return listMessages;

    const singleMessage = responseMessage.trim();
    return singleMessage ? [singleMessage] : [];
}

function applyTemplate(template: string, message: any): string {
    const userName = message.author?.global_name || message.author?.username || "user";
    const mention = message.author?.id ? `<@${message.author.id}>` : userName;
    const channel = message.channel_id ? `<#${message.channel_id}>` : "";
    const messageContent = message.content || "";

    return template
        .replace(/\{user\}/g, userName)
        .replace(/\{mention\}/g, mention)
        .replace(/\{channel\}/g, channel)
        .replace(/\{message\}/g, messageContent);
}

function pruneRateLimitEntries(now: number): void {
    while (sentReplyTimestamps.length > 0 && now - sentReplyTimestamps[0] >= 60_000) {
        sentReplyTimestamps.shift();
    }
}

function isRateLimited(now: number, maxRepliesPerMinute: number): boolean {
    if (maxRepliesPerMinute <= 0) return false;

    pruneRateLimitEntries(now);
    return sentReplyTimestamps.length >= maxRepliesPerMinute;
}

function isInCooldown(now: number, lastEventTime: number | undefined, cooldownMs: number): boolean {
    if (cooldownMs <= 0 || lastEventTime == null) return false;
    return now - lastEventTime < cooldownMs;
}

function messageMentionsUser(message: any, userId?: string): boolean {
    if (!userId) return false;

    const mentions = Array.isArray(message?.mentions) ? message.mentions : [];
    if (mentions.some((mention: any) => mention?.id === userId)) return true;

    const content = typeof message?.content === "string" ? message.content : "";
    return content.includes(`<@${userId}>`) || content.includes(`<@!${userId}>`);
}

function clampMessageLength(content: string): string {
    if (content.length <= MAX_DISCORD_MESSAGE_LENGTH) return content;
    return content.slice(0, MAX_DISCORD_MESSAGE_LENGTH).trimEnd();
}

function pruneProcessedMessages(now: number): void {
    for (const [messageId, processedAt] of processedMessageIds) {
        if (now - processedAt < PROCESSED_MESSAGE_TTL_MS) break;
        processedMessageIds.delete(messageId);
    }

    while (processedMessageIds.size > MAX_PROCESSED_MESSAGE_IDS) {
        const oldestMessageId = processedMessageIds.keys().next().value;
        if (!oldestMessageId) break;
        processedMessageIds.delete(oldestMessageId);
    }
}

function hasProcessedMessage(messageId: string, now: number): boolean {
    pruneProcessedMessages(now);
    if (processedMessageIds.has(messageId)) return true;

    processedMessageIds.set(messageId, now);
    pruneProcessedMessages(now);
    return false;
}

const settings = definePluginSettings({
    triggerPrefix: {
        type: OptionType.STRING,
        description: "Send a response if the message starts with this text",
        default: "",
    },
    responseMessage: {
        type: OptionType.STRING,
        description: "The message to send when triggered",
        default: "",
    },
    responseMessages: {
        type: OptionType.STRING,
        description: "Optional list of responses (one per line). Randomly picks one",
        default: "",
    },
    channelId: {
        type: OptionType.STRING,
        description: "Optional single channel ID (also merged into Channel Whitelist)",
        default: "",
    },
    channelWhitelist: {
        type: OptionType.STRING,
        description: "Optional channel IDs (comma/newline separated)",
        default: "",
    },
    delayMs: {
        type: OptionType.NUMBER,
        description: "Delay before sending the response (in milliseconds)",
        default: 500,
    },
    caseInsensitive: {
        type: OptionType.BOOLEAN,
        description: "Match trigger without case sensitivity",
        default: false,
    },
    exactMatch: {
        type: OptionType.BOOLEAN,
        description: "Match full message instead of startsWith (ignored if regex is enabled)",
        default: false,
    },
    useRegex: {
        type: OptionType.BOOLEAN,
        description: "Use trigger as regex (supports /pattern/flags)",
        default: false,
    },
    onlyInDMs: {
        type: OptionType.BOOLEAN,
        description: "Only trigger in DMs",
        default: false,
    },
    excludeDMs: {
        type: OptionType.BOOLEAN,
        description: "Do not trigger in DMs",
        default: false,
    },
    onlyWhenMentioned: {
        type: OptionType.BOOLEAN,
        description: "Only trigger when your user is mentioned",
        default: false,
    },
    triggerOnSelfMessages: {
        type: OptionType.BOOLEAN,
        description: "Allow your own messages to trigger auto-replies",
        default: false,
    },
    triggerOnBotMessages: {
        type: OptionType.BOOLEAN,
        description: "Allow bot messages to trigger auto-replies",
        default: false,
    },
    perUserCooldownMs: {
        type: OptionType.NUMBER,
        description: "Cooldown for each user before auto-reply can trigger again (0 disables)",
        default: 10_000,
    },
    perChannelCooldownMs: {
        type: OptionType.NUMBER,
        description: "Cooldown for each channel before auto-reply can trigger again (0 disables)",
        default: 0,
    },
    maxRepliesPerMinute: {
        type: OptionType.NUMBER,
        description: "Maximum auto-replies per minute globally (0 disables)",
        default: 0,
    },
});

export default definePlugin({
    name: "AutoReplyContent",
    description: "Automatically sends a response when a message starts with a trigger phrase",
    authors: [Devs.rz30],
    settings,
    start() {
        isPluginRunning = true;
    },
    stop() {
        isPluginRunning = false;

        for (const timeoutId of pendingTimeouts) {
            clearTimeout(timeoutId);
        }

        pendingTimeouts.clear();
        lastMessageIds.clear();
        userCooldowns.clear();
        channelCooldowns.clear();
        processedMessageIds.clear();
        sentReplyTimestamps.length = 0;
        invalidRegexCache.clear();
    },

    flux: {
        MESSAGE_CREATE({ message }: any) {
            if (!isPluginRunning) return;

            const {
                triggerPrefix,
                responseMessage,
                responseMessages,
                channelId,
                channelWhitelist,
                delayMs,
                caseInsensitive,
                exactMatch,
                useRegex,
                onlyInDMs,
                excludeDMs,
                onlyWhenMentioned,
                triggerOnSelfMessages,
                triggerOnBotMessages,
                perUserCooldownMs,
                perChannelCooldownMs,
                maxRepliesPerMinute,
            } = settings.store;

            if (!message?.content || typeof message.content !== "string") return;
            if (!message.channel_id || typeof message.channel_id !== "string") return;
            if (!message.id || typeof message.id !== "string") return;
            if (hasProcessedMessage(message.id, Date.now())) return;
            if (!message.author?.id) return;
            if (!triggerOnBotMessages && message.author?.bot) return;

            const currentUserId = UserStore?.getCurrentUser?.()?.id;
            if (!triggerOnSelfMessages && currentUserId && message.author.id === currentUserId) return;
            if (onlyWhenMentioned && !messageMentionsUser(message, currentUserId)) return;

            const trimmedTriggerPrefix = triggerPrefix.trim();
            if (!trimmedTriggerPrefix) return;

            const responses = getResponseCandidates(responseMessage, responseMessages);
            if (responses.length === 0) return;

            if (onlyInDMs && excludeDMs) return;

            const isDM = !message.guild_id;
            if (onlyInDMs && !isDM) return;
            if (excludeDMs && isDM) return;

            const allowedChannels = parseIds(channelWhitelist);
            const trimmedChannelId = channelId.trim();
            if (trimmedChannelId) allowedChannels.add(trimmedChannelId);
            if (allowedChannels.size > 0 && !allowedChannels.has(message.channel_id)) return;

            lastMessageIds.set(message.channel_id, message.id);

            if (!matchesTrigger(message.content, trimmedTriggerPrefix, useRegex, exactMatch, caseInsensitive)) return;

            const triggeredMessageId = message.id;
            const safeDelayMs = Math.max(0, Number(delayMs) || 0);

            const timeoutId = setTimeout(() => {
                pendingTimeouts.delete(timeoutId);
                if (!isPluginRunning) return;

                const latestId = lastMessageIds.get(message.channel_id);
                if (latestId !== triggeredMessageId) return;

                const now = Date.now();
                const safePerUserCooldownMs = Math.max(0, Number(perUserCooldownMs) || 0);
                const safePerChannelCooldownMs = Math.max(0, Number(perChannelCooldownMs) || 0);
                const safeMaxRepliesPerMinute = Math.max(0, Number(maxRepliesPerMinute) || 0);

                if (isInCooldown(now, userCooldowns.get(message.author.id), safePerUserCooldownMs)) return;
                if (isInCooldown(now, channelCooldowns.get(message.channel_id), safePerChannelCooldownMs)) return;
                if (isRateLimited(now, safeMaxRepliesPerMinute)) return;

                const selectedResponse = pickRandom(responses);
                const renderedResponse = clampMessageLength(applyTemplate(selectedResponse, message).trim());
                if (!renderedResponse) return;

                console.log("[AutoReplyContent] Sending: " + renderedResponse);
                MessageActions.sendMessage(
                    message.channel_id,
                    {
                        content: renderedResponse,
                        tts: false,
                        invalidEmojis: [],
                        validNonShortcutEmojis: [],
                    },
                    undefined,
                    { nonce: String(Date.now()) }
                );

                userCooldowns.set(message.author.id, now);
                channelCooldowns.set(message.channel_id, now);
                pruneRateLimitEntries(now);
                sentReplyTimestamps.push(now);
            }, safeDelayMs);

            pendingTimeouts.add(timeoutId);
        },
    },
});

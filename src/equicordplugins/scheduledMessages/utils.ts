/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Logger } from "@utils/Logger";
import { CloudUpload, Message } from "@vencord/discord-types";
import { CloudUploadPlatform } from "@vencord/discord-types/enums";
import { findLazy } from "@webpack";
import { ChannelStore, Constants, FluxDispatcher, GuildStore, IconUtils, MessageActions, MessageStore, RestAPI, showToast, SnowflakeUtils, Toasts, UserStore } from "@webpack/common";

import { settings } from ".";
import { PhantomMessageData, ScheduledAttachment, ScheduledMessage, ScheduledReaction } from "./types";

const logger = new Logger("ScheduledMessages");

const CloudUploader = findLazy(m => m.prototype?.trackUploadFinished) as typeof CloudUpload;

const STORAGE_KEY = "ScheduledMessages_queue";

let scheduledMessages: ScheduledMessage[] = [];
let checkInterval: ReturnType<typeof setInterval> | null = null;
let isProcessingMessages = false;

export const phantomMessageMap = new Map<string, PhantomMessageData>();
const pendingReactions = new Map<string, ScheduledReaction[]>();

const recentReactionChanges = new Map<string, { action: string; timestamp: number; }>();
const REACTION_COOLDOWN_MS = 2000;

const pendingRecreations = new Map<string, ReturnType<typeof setTimeout>>();
const RECREATE_DEBOUNCE_MS = 300;

export async function loadScheduledMessages(): Promise<void> {
    const saved = await DataStore.get<ScheduledMessage[]>(STORAGE_KEY);
    scheduledMessages = Array.isArray(saved) ? saved : [];
}

async function saveScheduledMessages(): Promise<void> {
    await DataStore.set(STORAGE_KEY, scheduledMessages);
}

export function getScheduledMessages(): ScheduledMessage[] {
    return [...scheduledMessages];
}

export function getChannelDisplayInfo(channelId: string): { name: string; avatar: string; } {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return { name: "Unknown", avatar: "" };

    if (channel.isDM()) {
        const user = channel.recipients?.[0] ? UserStore.getUser(channel.recipients[0]) : null;
        return user
            ? { name: user.globalName ?? user.username, avatar: IconUtils.getUserAvatarURL(user, true, 64) }
            : { name: "DM", avatar: "" };
    }

    if (channel.isGroupDM() || channel.isMultiUserDM()) {
        return { name: channel.name || "Group DM", avatar: IconUtils.getChannelIconURL(channel) ?? "" };
    }

    const guild = GuildStore.getGuild(channel.guild_id);
    return {
        name: channel.name || "Channel",
        avatar: guild ? IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, canAnimate: true, size: 512 }) ?? "" : ""
    };
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number; }> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 400, height: 300 });
        img.src = dataUrl;
    });
}

function getVideoPreview(dataUrl: string): Promise<{ width: number; height: number; previewUrl: string; } | null> {
    return new Promise(resolve => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;

        const timeout = setTimeout(() => { video.src = ""; resolve(null); }, 5000);

        video.onloadeddata = () => { clearTimeout(timeout); video.currentTime = 0; };
        video.onerror = () => { clearTimeout(timeout); resolve(null); };

        video.onseeked = () => {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) { resolve(null); video.src = ""; return; }

            ctx.drawImage(video, 0, 0);
            const size = Math.min(canvas.width, canvas.height) * 0.2;
            const cx = canvas.width / 2, cy = canvas.height / 2;

            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.beginPath();
            ctx.arc(cx, cy, size, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.3, cy - size * 0.4);
            ctx.lineTo(cx - size * 0.3, cy + size * 0.4);
            ctx.lineTo(cx + size * 0.5, cy);
            ctx.closePath();
            ctx.fill();

            resolve({ width: video.videoWidth, height: video.videoHeight, previewUrl: canvas.toDataURL("image/png") });
            video.src = "";
        };

        video.src = dataUrl;
    });
}

async function buildPhantomAttachments(attachments: ScheduledAttachment[]) {
    const result: { id: string; filename: string; size: number; content_type: string; url?: string; proxy_url?: string; width?: number; height?: number; }[] = [];

    for (let idx = 0; idx < attachments.length; idx++) {
        const att = attachments[idx];
        const dataUrl = `data:${att.type};base64,${att.data}`;
        const attachment: typeof result[0] = {
            id: String(idx),
            filename: att.filename,
            size: Math.ceil(att.data.length * 0.75),
            content_type: att.type
        };

        if (att.type.startsWith("image/")) {
            const dims = await getImageDimensions(dataUrl);
            Object.assign(attachment, { url: dataUrl, proxy_url: dataUrl, ...dims });
        } else if (["video/mp4", "video/webm", "video/ogg"].includes(att.type)) {
            const preview = await getVideoPreview(dataUrl);
            if (preview) {
                Object.assign(attachment, {
                    content_type: "image/png",
                    url: preview.previewUrl,
                    proxy_url: preview.previewUrl,
                    width: preview.width,
                    height: preview.height,
                    filename: att.filename.replace(/\.[^.]+$/, "_preview.png")
                });
            }
        }

        result.push(attachment);
    }

    return result;
}

export async function createPhantomMessage(msg: ScheduledMessage): Promise<void> {
    if (!settings.store.showPhantomMessages) return;

    const currentUser = UserStore.getCurrentUser();
    if (!currentUser) return;

    const messageId = `scheduled-${msg.id}`;

    phantomMessageMap.set(messageId, { scheduledTime: msg.scheduledTime, messageId: msg.id, channelId: msg.channelId });
    if (msg.reactions?.length) pendingReactions.set(msg.id, [...msg.reactions]);

    const attachments = msg.attachments?.length ? await buildPhantomAttachments(msg.attachments) : [];

    const initialReactions = (msg.reactions ?? []).map(r => ({
        emoji: r.emoji,
        count: r.count,
        count_details: { burst: 0, normal: r.count },
        me: true,
        me_burst: false,
        burst_count: 0,
        burst_colors: [],
        burst_me: false
    }));

    const messagesLoaded = MessageStore.hasPresent(msg.channelId)
        ? Promise.resolve()
        : MessageActions.fetchMessages({ channelId: msg.channelId });

    messagesLoaded.then(() => {
        FluxDispatcher.dispatch({
            type: "MESSAGE_CREATE",
            channelId: msg.channelId,
            message: {
                id: messageId,
                channel_id: msg.channelId,
                author: {
                    id: currentUser.id,
                    username: currentUser.username,
                    discriminator: currentUser.discriminator || "0",
                    avatar: currentUser.avatar,
                    global_name: currentUser.globalName ?? null,
                    bot: false
                },
                content: msg.content,
                timestamp: new Date().toISOString(),
                edited_timestamp: null,
                tts: false,
                mention_everyone: false,
                mentions: [],
                mention_roles: [],
                attachments,
                embeds: [],
                pinned: false,
                type: 0,
                flags: 0,
                components: [],
                reactions: initialReactions,
                nonce: messageId,
                scheduledMessageData: { scheduledTime: msg.scheduledTime, messageId: msg.id }
            },
            optimistic: true,
            sendMessageOptions: {},
            isPushNotification: false
        });

        applyPhantomClassToMessage(msg.channelId, messageId);
    }).catch(() => { });
}

function applyPhantomClassToMessage(channelId: string, messageId: string): void {
    const tryApply = (retries = 0) => {
        const el = document.getElementById(`chat-messages-${channelId}-${messageId}`);
        if (el) {
            el.classList.add("vc-scheduled-msg-phantom");
            return true;
        }
        if (retries < 20) {
            setTimeout(() => tryApply(retries + 1), 100 + retries * 50);
        }
        return false;
    };

    setTimeout(() => tryApply(), 50);
}

function removePhantomMessage(msg: ScheduledMessage): void {
    const messageId = `scheduled-${msg.id}`;
    phantomMessageMap.delete(messageId);
    FluxDispatcher.dispatch({ type: "MESSAGE_DELETE", channelId: msg.channelId, id: messageId, mlDeleted: true });
}

function updatePhantomReactions(messageId: string, channelId: string, reactions: ScheduledReaction[]): void {
    const existingTimeout = pendingRecreations.get(messageId);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
        pendingRecreations.delete(messageId);
        doRecreatePhantomMessage(messageId, channelId, reactions);
    }, RECREATE_DEBOUNCE_MS);

    pendingRecreations.set(messageId, timeout);
}

function doRecreatePhantomMessage(messageId: string, channelId: string, reactions: ScheduledReaction[]): void {
    logger.info("doRecreatePhantomMessage: Recreating phantom message with", reactions.length, "reactions");

    const phantomData = phantomMessageMap.get(messageId);
    if (!phantomData) {
        logger.warn("doRecreatePhantomMessage: No phantom data found");
        return;
    }

    const msg = scheduledMessages.find(m => m.id === phantomData.messageId);
    if (!msg) {
        logger.warn("doRecreatePhantomMessage: No scheduled message found");
        return;
    }

    FluxDispatcher.dispatch({
        type: "MESSAGE_DELETE",
        channelId,
        id: messageId,
        mlDeleted: true
    });

    setTimeout(() => {
        msg.reactions = reactions;
        createPhantomMessage(msg);
    }, 50);
}

async function uploadAttachment(channelId: string, att: ScheduledAttachment): Promise<{ id: string; filename: string; uploaded_filename: string; } | null> {
    return new Promise(resolve => {
        const bytes = Uint8Array.from(atob(att.data), c => c.charCodeAt(0));
        const file = new File([bytes], att.filename, { type: att.type });
        const upload = new CloudUploader({ file, platform: CloudUploadPlatform.WEB }, channelId);

        upload.on("complete", () => resolve({ id: "", filename: upload.filename, uploaded_filename: upload.uploadedFilename }));
        upload.on("error", () => resolve(null));
        upload.upload();
    });
}

async function postMessage(channelId: string, content: string, attachments?: { id: string; filename: string; uploaded_filename: string; }[]): Promise<void> {
    await RestAPI.post({
        url: Constants.Endpoints.MESSAGES(channelId),
        body: {
            content,
            nonce: SnowflakeUtils.fromTimestamp(Date.now()),
            ...(attachments?.length ? { channel_id: channelId, sticker_ids: [], type: 0, attachments } : {})
        }
    });
}

async function addReactionsToMessage(channelId: string, messageId: string, reactions: ScheduledReaction[]): Promise<void> {
    for (const reaction of reactions) {
        const emojiStr = reaction.emoji.id
            ? `${reaction.emoji.name}:${reaction.emoji.id}`
            : encodeURIComponent(reaction.emoji.name);

        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                await RestAPI.put({ url: `/channels/${channelId}/messages/${messageId}/reactions/${emojiStr}/@me` });
                break;
            } catch (e) {
                const err = e as { status?: number; body?: { retry_after?: number; }; };
                if (err.status === 429 || err.body?.retry_after) {
                    await new Promise(r => setTimeout(r, (err.body?.retry_after ?? 1) * 1000 + 100));
                } else if (err.status === 404) {
                    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                } else {
                    break;
                }
            }
        }
        await new Promise(r => setTimeout(r, 350));
    }
}

async function sendScheduledMessage(msg: ScheduledMessage): Promise<boolean> {
    try {
        if (!ChannelStore.getChannel(msg.channelId)) return false;

        const reactions = pendingReactions.get(msg.id) ?? msg.reactions ?? [];
        removePhantomMessage(msg);
        pendingReactions.delete(msg.id);

        if (msg.attachments?.length) {
            const uploaded = (await Promise.all(msg.attachments.map((att, i) =>
                uploadAttachment(msg.channelId, att).then(r => r ? { ...r, id: String(i) } : null)
            ))).filter(Boolean) as { id: string; filename: string; uploaded_filename: string; }[];

            await postMessage(msg.channelId, msg.content, uploaded.length ? uploaded : undefined);
        } else {
            await postMessage(msg.channelId, msg.content);
        }

        if (reactions.length) {
            await new Promise(r => setTimeout(r, 1500));
            const msgArray = (MessageStore.getMessages(msg.channelId) as { _array?: Message[]; })?._array ?? [];
            const currentUserId = UserStore.getCurrentUser()?.id;

            for (let i = msgArray.length - 1; i >= Math.max(0, msgArray.length - 10); i--) {
                const m = msgArray[i];
                if (m?.author?.id === currentUserId && m?.content === msg.content && !m?.id?.startsWith("scheduled-")) {
                    await addReactionsToMessage(msg.channelId, m.id, reactions);
                    break;
                }
            }
        }

        if (settings.store.showNotifications) {
            showToast(`Scheduled message sent to ${getChannelDisplayInfo(msg.channelId).name}`, Toasts.Type.SUCCESS);
        }
        return true;
    } catch {
        if (settings.store.showNotifications) showToast("Failed to send scheduled message", Toasts.Type.FAILURE);
        return false;
    }
}

export async function addScheduledMessage(
    channelId: string,
    content: string,
    scheduledTime: number,
    attachments?: ScheduledAttachment[]
): Promise<{ success: boolean; error?: string; }> {
    const minuteStart = Math.floor(scheduledTime / 60000) * 60000;
    const count = scheduledMessages.filter(m =>
        m.channelId === channelId && m.scheduledTime >= minuteStart && m.scheduledTime < minuteStart + 60000
    ).length;

    if (count >= settings.store.maxMessagesPerMinute) {
        return { success: false, error: `Maximum of ${settings.store.maxMessagesPerMinute} messages per channel per minute reached` };
    }

    const newMessage: ScheduledMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        channelId,
        content,
        scheduledTime,
        createdAt: Date.now(),
        attachments
    };

    scheduledMessages.push(newMessage);
    scheduledMessages.sort((a, b) => a.scheduledTime - b.scheduledTime);
    await saveScheduledMessages();
    createPhantomMessage(newMessage);

    return { success: true };
}

export async function removeScheduledMessage(id: string): Promise<void> {
    const msg = scheduledMessages.find(m => m.id === id);
    if (msg) removePhantomMessage(msg);
    scheduledMessages = scheduledMessages.filter(m => m.id !== id);
    await saveScheduledMessages();
}

export async function clearAllScheduledMessages(): Promise<void> {
    for (const msg of scheduledMessages) {
        removePhantomMessage(msg);
    }
    scheduledMessages = [];
    await saveScheduledMessages();
}

async function checkAndSendMessages(): Promise<void> {
    if (isProcessingMessages) return;
    isProcessingMessages = true;

    try {
        const now = Date.now();
        const dueMessages = scheduledMessages.filter(m => m.scheduledTime <= now);

        for (const msg of dueMessages) {
            await removeScheduledMessage(msg.id);
            await sendScheduledMessage(msg);
        }
    } finally {
        isProcessingMessages = false;
    }
}

export function startScheduler(): void {
    if (checkInterval) return;
    checkAndSendMessages();
    checkInterval = setInterval(checkAndSendMessages, settings.store.checkIntervalSeconds * 1000);
}

export function stopScheduler(): void {
    if (checkInterval) { clearInterval(checkInterval); checkInterval = null; }
}

export async function recreatePhantomMessages(): Promise<void> {
    for (const msg of scheduledMessages) await createPhantomMessage(msg);
}

export function cleanupAllPhantomMessages(): void {
    for (const msg of scheduledMessages) removePhantomMessage(msg);
}

function modifyReaction(messageId: string, channelId: string, emoji: { id: string | null; name: string; animated?: boolean; }, delta: number): void {
    logger.info("modifyReaction called:", { messageId, emoji: emoji.name, delta });

    const phantomData = phantomMessageMap.get(messageId);
    if (!phantomData) {
        logger.warn("modifyReaction: No phantom data found for messageId =", messageId);
        return;
    }

    const msg = scheduledMessages.find(m => m.id === phantomData.messageId);
    if (!msg) {
        logger.warn("modifyReaction: No scheduled message found for id =", phantomData.messageId);
        return;
    }

    const reactions = pendingReactions.get(phantomData.messageId) ?? [];
    const idx = reactions.findIndex(r => r.emoji.name === emoji.name && r.emoji.id === emoji.id);

    logger.info("modifyReaction: Current reactions count =", reactions.length, "found at idx =", idx);

    if (delta > 0) {
        if (idx >= 0) reactions[idx].count += delta;
        else reactions.push({ emoji: { id: emoji.id ?? null, name: emoji.name, animated: emoji.animated }, count: 1 });
    } else if (idx >= 0) {
        reactions[idx].count += delta;
        if (reactions[idx].count <= 0) reactions.splice(idx, 1);
    }

    pendingReactions.set(phantomData.messageId, reactions);
    msg.reactions = reactions;
    saveScheduledMessages();

    logger.info("modifyReaction: Updated reactions count =", reactions.length, "calling updatePhantomReactions");
    updatePhantomReactions(messageId, channelId, reactions);
}

function getReactionKey(messageId: string, emoji: { id: string | null; name: string; }): string {
    return `${messageId}:${emoji.name}:${emoji.id ?? ""}`;
}

export function handleReactionAdd(messageId: string, channelId: string, emoji: { id: string | null; name: string; animated?: boolean; }): void {
    const key = getReactionKey(messageId, emoji);
    const recent = recentReactionChanges.get(key);
    const now = Date.now();

    if (recent && recent.action === "add" && now - recent.timestamp < REACTION_COOLDOWN_MS) {
        logger.info("handleReactionAdd: Ignoring duplicate ADD within cooldown", { messageId, emoji: emoji.name });
        return;
    }

    if (recent && recent.action === "remove" && now - recent.timestamp < REACTION_COOLDOWN_MS) {
        logger.info("handleReactionAdd: Ignoring Discord revert (ADD after our REMOVE)", { messageId, emoji: emoji.name });
        resyncPhantomReactions(messageId, channelId);
        return;
    }

    logger.info("handleReactionAdd: Processing", { messageId, emoji: emoji.name });
    recentReactionChanges.set(key, { action: "add", timestamp: now });
    modifyReaction(messageId, channelId, emoji, 1);
}

export function handleReactionRemove(messageId: string, channelId: string, emoji: { id: string | null; name: string; }): void {
    const key = getReactionKey(messageId, emoji);
    const recent = recentReactionChanges.get(key);
    const now = Date.now();

    if (recent && recent.action === "remove" && now - recent.timestamp < REACTION_COOLDOWN_MS) {
        logger.info("handleReactionRemove: Ignoring duplicate REMOVE within cooldown", { messageId, emoji: emoji.name });
        return;
    }

    if (recent && recent.action === "add" && now - recent.timestamp < REACTION_COOLDOWN_MS) {
        logger.info("handleReactionRemove: Ignoring Discord revert (REMOVE after our ADD)", { messageId, emoji: emoji.name });
        resyncPhantomReactions(messageId, channelId);
        return;
    }

    logger.info("handleReactionRemove: Processing", { messageId, emoji: emoji.name });
    recentReactionChanges.set(key, { action: "remove", timestamp: now });
    modifyReaction(messageId, channelId, emoji, -1);
}

export function isPhantomMessage(messageId: string): boolean {
    return phantomMessageMap.has(messageId);
}

export function resyncPhantomReactions(messageId: string, channelId: string): void {
    logger.info("resyncPhantomReactions:", { messageId });

    const phantomData = phantomMessageMap.get(messageId);
    if (!phantomData) {
        logger.warn("resyncPhantomReactions: No phantom data for messageId =", messageId);
        return;
    }

    const reactions = pendingReactions.get(phantomData.messageId) ?? [];
    logger.info("resyncPhantomReactions: Found", reactions.length, "reactions to sync");

    updatePhantomReactions(messageId, channelId, reactions);
}

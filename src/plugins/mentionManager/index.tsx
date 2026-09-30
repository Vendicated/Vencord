/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import {
    ChannelStore,
    Menu,
    MessageStore,
    ReadStateStore,
    SnowflakeUtils,
    Toasts,
    UserStore
} from "@webpack/common";

import { type ClassifiableMessage, classifyMention, isIndexableMention, type MentionType } from "./classifier";
import { jumpToMention } from "./jump";
import { type MentionEntry,MentionIndex } from "./mentionIndex";
import { clearPersistedIndex, createDebouncedSaver, loadIndex } from "./persist";
import { shouldAck, type SmartReadConfig,SmartReadScheduler } from "./smartRead";

const logger = new Logger("MentionManager");

// Discord channel types (numeric API values): GUILD_TEXT=0, DM=1, GROUP_DM=3.
const DM_TYPE = 1;
const GROUP_DM_TYPE = 3;

const settings = definePluginSettings({
    enableSmartRead: {
        type: OptionType.BOOLEAN,
        description: "Automatically mark irrelevant mentions (@everyone, @here, roles, other users) as read. Off by default — enable explicitly.",
        default: false
    },
    ignoreEveryone: { type: OptionType.BOOLEAN, description: "Smart Read: auto-ack @everyone", default: true },
    ignoreHere: { type: OptionType.BOOLEAN, description: "Smart Read: auto-ack @here", default: true },
    ignoreRoles: { type: OptionType.BOOLEAN, description: "Smart Read: auto-ack role mentions that don't include you", default: true },
    ignoreOtherUsers: { type: OptionType.BOOLEAN, description: "Smart Read: auto-ack mentions of other users", default: true },
    preserveDirectMentions: { type: OptionType.BOOLEAN, description: "Never auto-ack direct mentions of you", default: true },
    preserveReplies: { type: OptionType.BOOLEAN, description: "Never auto-ack replies to your messages", default: true },
    preserveDMs: { type: OptionType.BOOLEAN, description: "Never auto-ack in DMs and Group DMs", default: true },
    enableMentionNavigation: { type: OptionType.BOOLEAN, description: "Enable Go to Mention navigation", default: true },
    circularNavigation: { type: OptionType.BOOLEAN, description: "Wrap around when reaching the oldest/newest mention", default: false },
    persistentHistory: { type: OptionType.BOOLEAN, description: "Persist the mention index across restarts (local DataStore)", default: true },
    maxEntries: { type: OptionType.SLIDER, description: "Maximum stored mentions (oldest removed first)", markers: [100, 200, 300, 500, 1000], default: 300, stickToMarkers: true },
    retentionDays: { type: OptionType.SLIDER, description: "Retention period in days", markers: [7, 14, 30, 60, 90], default: 30, stickToMarkers: true },
    clearHistory: {
        type: OptionType.COMPONENT,
        component: () => (
            <Button onClick={() => void clearHistory()}>
                Clear mention history
            </Button>
        )
    },
    debugLogging: { type: OptionType.BOOLEAN, description: "Verbose console logging", default: false }
});

const index = new MentionIndex();
let saver = createDebouncedSaver(index);
let scheduler: SmartReadScheduler | null = null;
/** Navigator cursor: messageId currently pointed at (null = next jump starts at newest). */
let navCursor: string | null = null;

function dbg(...args: any[]) {
    if (settings.store.debugLogging) logger.info(...args);
}

function currentUserId(): string | null {
    try {
        return UserStore.getCurrentUser()?.id ?? null;
    } catch {
        return null;
    }
}

function channelInfo(channelId: string): { guildId: string | null; isDM: boolean; threadParentId?: string; } {
    try {
        const c: any = ChannelStore.getChannel(channelId);
        if (!c) return { guildId: null, isDM: false };
        const t = c.type as number;
        const isDM = t === DM_TYPE || t === GROUP_DM_TYPE;
        const threadParent = typeof c.isThread === "function" && c.isThread() ? c.parent_id as string | undefined : undefined;
        return { guildId: (c.guild_id as string | undefined) ?? null, isDM, threadParentId: threadParent };
    } catch {
        return { guildId: null, isDM: false };
    }
}

function toTimestamp(messageId: string): number {
    try {
        return SnowflakeUtils.extractTimestamp(messageId);
    } catch {
        return Date.now();
    }
}

/** Resolve the reply target author from embedded data or the message cache. */
function resolveReplyAuthorId(msg: ClassifiableMessage & { channel_id?: string; }): string | undefined {
    const embedded = (msg as { referenced_message?: { author?: { id?: string; }; }; }).referenced_message?.author?.id;
    if (embedded) return embedded;
    const ref = msg.messageReference ?? (msg as { message_reference?: { channel_id?: string; message_id?: string; }; }).message_reference;
    if (ref?.message_id) {
        try {
            const refChannel = (ref as { channel_id?: string; }).channel_id ?? msg.channel_id;
            if (refChannel) {
                const target: any = MessageStore.getMessage(refChannel, ref.message_id);
                if (target?.author?.id) return target.author.id as string;
            }
        } catch { /* cache miss — treat as unknown */ }
    }
    return undefined;
}

/** Same helper for already-cached full Message models. */
function resolveCachedReplyAuthorId(m: any, channelId: string): string | undefined {
    const embedded = m?.referencedMessage?.author?.id;
    if (embedded) return embedded as string;
    const ref = m?.messageReference;
    if (ref?.message_id) {
        try {
            const target: any = MessageStore.getMessage(ref.channel_id ?? channelId, ref.message_id);
            if (target?.author?.id) return target.author.id as string;
        } catch { /* cache miss */ }
    }
    return undefined;
}

function smartReadConfig(): SmartReadConfig {
    const s = settings.store;
    return {
        enabled: s.enableSmartRead,
        ignoreEveryone: s.ignoreEveryone,
        ignoreHere: s.ignoreHere,
        ignoreRoles: s.ignoreRoles,
        ignoreOtherUsers: s.ignoreOtherUsers,
        preserveDirectMentions: s.preserveDirectMentions,
        preserveReplies: s.preserveReplies,
        preserveDMs: s.preserveDMs,
        debounceMs: 1500
    };
}

function persistSoon() {
    if (settings.store.persistentHistory) saver.schedule();
}

function pruneIfNeeded() {
    const removed = index.prune(settings.store.maxEntries, settings.store.retentionDays * 86400000);
    if (removed > 0) {
        dbg(`Pruned ${removed} entries.`);
        persistSoon();
    }
}

function indexEntry(raw: { id: string; channelId: string; authorId: string; type: MentionType; }) {
    const info = channelInfo(raw.channelId);
    const added = index.add({
        messageId: raw.id,
        channelId: raw.channelId,
        guildId: info.guildId,
        authorId: raw.authorId,
        mentionType: raw.type,
        timestamp: toTimestamp(raw.id),
        addedAt: Date.now(),
        threadParentId: info.threadParentId
    });
    if (added) {
        dbg(`Indexed mention ${raw.id} (${raw.type}).`);
        pruneIfNeeded();
        persistSoon();
    }
    return added;
}

function handleIncoming(raw: ClassifiableMessage & { id: string; channel_id: string; author?: { id?: string; }; }) {
    const myId = currentUserId();
    if (!myId || !raw?.id || !raw.channel_id) return;
    if (raw.author?.id === myId) return;

    const type: MentionType = classifyMention(raw, myId, resolveReplyAuthorId(raw));
    dbg(`Classified ${raw.id} in ${raw.channel_id} as ${type}.`);

    if (isIndexableMention(type)) {
        indexEntry({ id: raw.id, channelId: raw.channel_id, authorId: raw.author?.id ?? "unknown", type });
    }

    if (scheduler && shouldAck(type, smartReadConfig(), { isDM: channelInfo(raw.channel_id).isDM })) {
        scheduler.schedule(raw.channel_id, raw.id);
        dbg(`ACK scheduled for ${raw.channel_id} @ ${raw.id}.`);
    }
}

async function clearHistory() {
    index.clear();
    navCursor = null;
    await clearPersistedIndex();
    Toasts.show({ message: "Mention history cleared.", id: Toasts.genId(), type: Toasts.Type.MESSAGE });
}

function goToLatestMention(channelId?: string): void {
    if (!settings.store.enableMentionNavigation) return;
    const target = channelId ? index.lastInChannel(channelId) : index.last();
    if (!target) {
        Toasts.show({ message: "No mentions indexed yet.", id: Toasts.genId(), type: Toasts.Type.MESSAGE });
        return;
    }
    navCursor = target.messageId;
    navigateToEntry(target);
}

function stepCursor(step: 1 | -1): void {
    if (!settings.store.enableMentionNavigation) return;
    let target: MentionEntry | null = null;
    if (navCursor && index.has(navCursor)) {
        target = step === -1 ? index.previous(navCursor) : index.next(navCursor);
    }
    if (!target) {
        const newest = index.last();
        if (!newest) {
            Toasts.show({ message: "No mentions indexed yet.", id: Toasts.genId(), type: Toasts.Type.MESSAGE });
            return;
        }
        if (navCursor != null && !settings.store.circularNavigation) {
            Toasts.show({
                message: step === -1 ? "Reached the oldest indexed mention." : "Reached the newest indexed mention.",
                id: Toasts.genId(),
                type: Toasts.Type.MESSAGE
            });
            navCursor = null;
            return;
        }
        target = step === 1 && navCursor != null ? index.first() ?? newest : newest;
    }
    navCursor = target.messageId;
    navigateToEntry(target);
}

function navigateToEntry(entry: MentionEntry) {
    const pos = index.positionOf(entry.messageId);
    const label = pos ? `${pos.position}/${pos.total}` : "";
    const res = jumpToMention(entry);
    if (!res.ok) {
        index.remove(entry.messageId);
        persistSoon();
        navCursor = null;
        Toasts.show({ message: "Mention no longer available, removed from history.", id: Toasts.genId(), type: Toasts.Type.FAILURE });
        return;
    }
    if (!res.cached) {
        Toasts.show({ message: `Jumped to channel${label ? ` (${label})` : ""} — message not in cache.`, id: Toasts.genId(), type: Toasts.Type.MESSAGE });
    } else if (label) {
        dbg(`Navigated to mention ${entry.messageId} (${label}).`);
    }
}

/**
 * Local-only backfill: harvest already-cached direct/reply/broadcast
 * mentions for channels that report unread mentions. No network requests.
 * This cannot recover mentions from while Discord was closed beyond what
 * the client already cached — that limitation is documented in README.md.
 */
function localBackfill() {
    const myId = currentUserId();
    if (!myId) return;
    let added = 0;
    try {
        const channels: string[] = ReadStateStore.getMentionChannelIds() ?? [];
        for (const channelId of channels) {
            try {
                const arr: unknown = (MessageStore.getMessages(channelId) as any)?._array ?? [];
                if (!Array.isArray(arr)) continue;
                for (const m of arr) {
                    const msg = m as { id?: string; author?: { id?: string; }; };
                    if (!msg?.id || msg.author?.id === myId || index.has(msg.id)) continue;
                    const type = classifyMention(msg, myId, resolveCachedReplyAuthorId(m, channelId));
                    if (!isIndexableMention(type)) continue;
                    indexEntry({ id: msg.id, channelId, authorId: msg.author?.id ?? "unknown", type });
                    added++;
                }
            } catch { /* per-channel failure must not abort the sweep */ }
        }
    } catch (e) {
        logger.warn("Local backfill failed.", e);
    }
    if (added > 0) logger.info(`Local backfill indexed ${added} mentions.`);
}

export default definePlugin({
    name: "MentionManager",
    description: "Smart-read irrelevant pings and jump between your mentions. Smart Read is off by default.",
    authors: [Devs.pxzy],
    tags: ["Notifications", "Chat", "Utility"],
    searchTerms: ["mention", "mentions", "unread", "jump", "ping", "ack"],
    settings,

    commands: [
        {
            name: "mention-last",
            description: "Jump to your most recent indexed mention",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: () => goToLatestMention()
        },
        {
            name: "mention-prev",
            description: "Jump to the previous indexed mention",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: () => stepCursor(-1)
        },
        {
            name: "mention-next",
            description: "Jump to the next indexed mention",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: () => stepCursor(1)
        }
    ],

    contextMenus: {
        "channel-context"(children, props: any) {
            const channel = props?.channel;
            if (!channel?.id) return;
            children.push(
                <Menu.MenuItem
                    id="mm-go-channel-mention"
                    key="mm-go-channel-mention"
                    label="Go to last mention in channel"
                    action={() => goToLatestMention(channel.id)}
                />
            );
        },
        "guild-context"(children) {
            children.push(
                <Menu.MenuItem
                    id="mm-go-guild-mention"
                    key="mm-go-guild-mention"
                    label="Go to latest mention"
                    action={() => goToLatestMention()}
                />
            );
        }
    },

    toolboxActions: {
        "Go to latest mention": () => goToLatestMention(),
        "Go to previous mention": () => stepCursor(-1),
        "Go to next mention": () => stepCursor(1)
    },

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: any; optimistic: boolean; }) {
            if (optimistic) return;
            try {
                handleIncoming(normalizeFluxMessage(message));
            } catch (e) {
                logger.warn("MESSAGE_CREATE handling failed.", e);
            }
        },
        MESSAGE_UPDATE({ message }: { message: any; }) {
            try {
                // Edits can add a mention after the fact — index it if relevant.
                handleIncoming(normalizeFluxMessage(message));
            } catch (e) {
                logger.warn("MESSAGE_UPDATE handling failed.", e);
            }
        },
        MESSAGE_DELETE({ id }: { id: string; }) {
            if (index.remove(id)) {
                if (navCursor === id) navCursor = null;
                persistSoon();
                dbg(`Removed deleted message ${id} from index.`);
            }
        },
        CONNECTION_OPEN() {
            try {
                localBackfill();
            } catch (e) {
                logger.warn("Backfill on connect failed.", e);
            }
        }
    },

    async start() {
        scheduler = new SmartReadScheduler(smartReadConfig);
        saver = createDebouncedSaver(index);
        if (settings.store.persistentHistory) {
            await loadIndex(index);
            pruneIfNeeded();
        }
        logger.info("MentionManager started.");
    },

    stop() {
        scheduler?.cancelAll();
        scheduler = null;
        saver.cancel();
        navCursor = null;
        index.clear();
        logger.info("MentionManager stopped.");
    }
});

/** Accept both the cached Message model and the smaller Flux payload. */
function normalizeFluxMessage(message: any): ClassifiableMessage & { id: string; channel_id: string; author?: { id?: string; }; } {
    return {
        id: message.id,
        channel_id: message.channel_id,
        author: message.author ? { id: message.author.id } : undefined,
        mentions: message.mentions,
        mentionEveryone: message.mentionEveryone,
        mention_everyone: message.mention_everyone,
        mentionRoles: message.mentionRoles,
        mention_roles: message.mention_roles,
        messageReference: message.messageReference,
        message_reference: message.message_reference,
        referenced_message: message.referenced_message ?? message.referencedMessage,
        content: message.content
    };
}

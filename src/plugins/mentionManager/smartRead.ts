/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { FluxDispatcher, MessageStore, ReadStateStore, UserStore } from "@webpack/common";

import { isBroadcast, type MentionType } from "./classifier";

const logger = new Logger("MentionManager");

export interface SmartReadConfig {
    enabled: boolean;
    ignoreEveryone: boolean;
    ignoreHere: boolean;
    ignoreRoles: boolean;
    ignoreOtherUsers: boolean;
    preserveDirectMentions: boolean;
    preserveReplies: boolean;
    preserveDMs: boolean;
    /** ms to wait for bursts in the same channel before acking once */
    debounceMs: number;
}

export const DEFAULT_DEBOUNCE_MS = 1500;

/**
 * Decide whether a classified message may be auto-acked.
 * DMs are never acked while `preserveDMs` is on.
 */
export function shouldAck(
    type: MentionType,
    cfg: SmartReadConfig,
    opts: { isDM: boolean; }
): boolean {
    if (!cfg.enabled) return false;
    if (type === "direct") return !cfg.preserveDirectMentions;
    if (type === "replyToMe") return !cfg.preserveReplies;
    if (opts.isDM && cfg.preserveDMs) return false;
    if (type === "everyone") return cfg.ignoreEveryone;
    if (type === "here") return cfg.ignoreHere;
    if (type === "role") return cfg.ignoreRoles;
    if (type === "otherUser") return cfg.ignoreOtherUsers;
    if (type === "none") return true;
    return false;
}

/** Structured check on a cached Message model (mentions are user ids). */
function isRelevantCachedMessage(m: any, myId: string, cfg: SmartReadConfig): boolean {
    if (cfg.preserveDirectMentions && Array.isArray(m?.mentions) && m.mentions.includes(myId)) return true;
    if (cfg.preserveReplies && m?.messageReference && m.referencedMessage?.author?.id === myId) return true;
    return false;
}

/**
 * Per-channel debounced BULK_ACK scheduler.
 *
 * Race safety: before dispatching, the cached channel messages in
 * `(ackMessageId, candidate]` are scanned for any relevant mention
 * (direct / reply-to-me). If one exists the ack is skipped — read state
 * is never advanced past an unread direct mention.
 *
 * Same dispatch shape as `src/plugins/readAllNotificationsButton`.
 */
export class SmartReadScheduler {
    private timers = new Map<string, ReturnType<typeof setTimeout>>();
    private pending = new Map<string, string>();

    constructor(private cfg: () => SmartReadConfig) { }

    schedule(channelId: string, messageId: string): void {
        const cur = this.pending.get(channelId);
        if (cur == null || messageId > cur) this.pending.set(channelId, messageId);

        if (this.timers.has(channelId)) return;
        const delay = Math.max(0, this.cfg().debounceMs || DEFAULT_DEBOUNCE_MS);
        this.timers.set(channelId, setTimeout(() => {
            this.timers.delete(channelId);
            const target = this.pending.get(channelId);
            this.pending.delete(channelId);
            if (target) this.ack(channelId, target);
        }, delay));
    }

    private ack(channelId: string, messageId: string): void {
        try {
            if (!this.isSafeToAck(channelId, messageId, this.cfg())) {
                logger.info(`SmartRead: skipped ack for ${channelId} (relevant mention ahead).`);
                return;
            }
            logger.info(`SmartRead: ack ${channelId} @ ${messageId}`);
            void FluxDispatcher.dispatch({
                type: "BULK_ACK",
                context: "APP",
                channels: [{ channelId, messageId, readStateType: 0 }]
            });
        } catch (e) {
            logger.warn("SmartRead ack failed.", e);
        }
    }

    private isSafeToAck(channelId: string, candidate: string, cfg: SmartReadConfig): boolean {
        try {
            const myId: string | undefined = UserStore.getCurrentUser()?.id;
            if (!myId) return false;

            // Newer traffic arrived while debouncing → re-arm for the newer id.
            const lastId: string | null = ReadStateStore.lastMessageId(channelId);
            if (lastId != null && lastId > candidate) {
                this.schedule(channelId, lastId);
                return false;
            }

            const ackId = ReadStateStore.ackMessageId(channelId) ?? "";
            const arr: unknown = (MessageStore.getMessages(channelId) as any)?._array ?? [];
            if (!Array.isArray(arr)) return true;
            for (const m of arr) {
                const msg = m as { id?: string; };
                if (msg?.id != null && msg.id > ackId && msg.id <= candidate && isRelevantCachedMessage(m, myId, cfg)) {
                    return false;
                }
            }
            return true;
        } catch {
            // Fail closed: when in doubt, don't ack.
            return false;
        }
    }

    cancelAll(): void {
        for (const t of this.timers.values()) clearTimeout(t);
        this.timers.clear();
        this.pending.clear();
    }
}

export { isBroadcast };

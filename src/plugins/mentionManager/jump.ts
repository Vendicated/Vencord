/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { ChannelStore, MessageStore, NavigationRouter } from "@webpack/common";

import type { MentionEntry } from "./mentionIndex";

const logger = new Logger("MentionManager");

export type JumpResult =
    | { ok: true; entry: MentionEntry; cached: boolean; }
    | { ok: false; reason: "unknown-channel" | "message-gone"; entry: MentionEntry; };

/**
 * Navigate to a mention using the client's own router (no DOM access).
 *
 * Uses a single message deep-link (`/channels/guild/channel/message`),
 * the same path the client itself uses for message links and search
 * jumps: it selects the guild + channel and scrolls to the message when
 * available. Threads work identically with the thread id as `channelId`.
 *
 * When the message is no longer in the local MessageStore cache we still
 * land on the channel and report `cached: false` so the caller can inform
 * the user. No automatic history fetching is attempted.
 */
export function jumpToMention(entry: MentionEntry): JumpResult {
    try {
        if (!ChannelStore.getChannel(entry.channelId)) {
            logger.warn(`Jump: unknown channel ${entry.channelId}, dropping entry.`);
            return { ok: false, reason: "unknown-channel", entry };
        }

        const guild = entry.guildId ?? "@me";
        NavigationRouter.transitionTo(`/channels/${guild}/${entry.channelId}/${entry.messageId}`);

        let cached = false;
        try {
            cached = MessageStore.getMessage(entry.channelId, entry.messageId) != null;
        } catch {
            cached = false;
        }

        if (!cached) logger.info(`Jumped to channel ${entry.channelId}; message ${entry.messageId} not in cache.`);
        return { ok: true, entry, cached };
    } catch (e) {
        logger.warn("Jump to mention failed.", e);
        return { ok: false, reason: "message-gone", entry };
    }
}

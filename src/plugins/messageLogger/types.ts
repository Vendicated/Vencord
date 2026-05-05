/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";

/**
 * The shape stored in IndexedDB. Note: this is a POJO — IndexedDB's structured
 * clone strips class identity. Reconstruct a real Message instance via
 * `restoreMessageInstance` in `restore.ts` before injecting into MessageCache.
 *
 * Date fields on Discord's Message (timestamp, editedTimestamp, etc.) are
 * persisted as ms-epoch numbers for stable serialization.
 */
export interface PersistedMessage {
    /** Discord message ID (snowflake string). Primary key. */
    id: string;
    /** Indexed. */
    channelId: string;
    /** Indexed. Undefined for DMs. */
    guildId?: string;
    /** ms epoch when WE first captured this entry. Indexed. */
    capturedAt: number;
    /** Indexed. */
    deleted: boolean;
    /** Discord Message JSON, minus class identity, with Date fields converted to numbers. */
    message: PlainMessage;
    /** History of prior versions, oldest-first. Timestamps as ms epoch. */
    editHistory?: { timestamp: number; content: string; }[];
    /** ms epoch. */
    firstEditTimestamp?: number;
    /**
     * If true, this entry is "saved" — retention purge skips it and the viewer's
     * Saved tab shows it. Convention: present-and-true means saved; absent means
     * not. Unstarring deletes this key rather than setting it to false, so the
     * `saved` IDB index stays sparse.
     */
    saved?: boolean;
}

/**
 * A `Message` after structured-clone round-trip — same shape, no class identity,
 * Date fields swapped for numbers.
 */
export type PlainMessage = Omit<Message, "timestamp" | "editedTimestamp" | "firstEditTimestamp"> & {
    timestamp: number;
    editedTimestamp: number | null;
    firstEditTimestamp?: number;
};

/** Internal write-buffer events. */
export type WriteEvent =
    | { kind: "delete"; message: Message; capturedAt: number; }
    | { kind: "edit"; newMessage: Message; oldMessage: Message; capturedAt: number; };

/** Current schema version. Bumped on incompatible storage changes. */
export const SCHEMA_VERSION = 2 as const;

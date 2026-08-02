/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

const STORE_KEY = "SavedMessages_v1";

export interface SavedMessage {
    // Discord ids, used to build the jump link and dedupe
    messageId: string;
    channelId: string;
    guildId?: string; // undefined = DM / group DM

    // Snapshotted at save-time, since Discord doesn't guarantee the
    // original message/author stays cached or even editable later
    authorId: string;
    authorName: string;
    authorAvatar: string;
    content: string;
    timestamp: string; // ISO string, original message timestamp

    savedAt: string; // ISO string, when the user saved it
}

async function getAll(): Promise<SavedMessage[]> {
    const data = await DataStore.get<SavedMessage[]>(STORE_KEY);
    return data ?? [];
}

async function setAll(messages: SavedMessage[]): Promise<void> {
    await DataStore.set(STORE_KEY, messages);
}

export async function getSavedMessages(): Promise<SavedMessage[]> {
    const all = await getAll();
    // newest saved first
    return [...all].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function saveMessage(message: SavedMessage): Promise<void> {
    const all = await getAll();
    if (all.some(m => m.messageId === message.messageId)) return;
    all.push(message);
    await setAll(all);
}

export async function removeSavedMessage(messageId: string): Promise<void> {
    const all = await getAll();
    await setAll(all.filter(m => m.messageId !== messageId));
}

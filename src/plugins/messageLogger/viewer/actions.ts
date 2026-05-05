/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { updateMessage } from "@api/MessageUpdater";
import { purgeMatching, removeEntry } from "@plugins/messageLogger/persistence";
import { PersistedMessage } from "@plugins/messageLogger/types";
import { Logger } from "@utils/Logger";
import { FluxDispatcher } from "@webpack/common";

const logger = new Logger("MessageLogger");

/**
 * Remove an entry from BOTH the persisted DB and the in-memory MessageCache.
 *
 * - DB removal is straightforward (`removeEntry`).
 * - For deletes: dispatch a synthetic `MESSAGE_DELETE` with `mlDeleted: true`,
 *   which phase-1's `handleDelete` recognizes as "actually drop this message"
 *   instead of "mark deleted". Removes the red-strikethrough ghost.
 * - For edits: clear the in-memory `editHistory` so the (edited) marker no
 *   longer offers the popover.
 *
 * Mirrors the existing channel-context-menu "Clear Message Log" behavior so
 * the viewer's clear/remove actions feel consistent with the rest of the plugin.
 */
export async function removeEntryFully(entry: PersistedMessage): Promise<void> {
    try {
        await removeEntry(entry.id);
        if (entry.deleted) {
            FluxDispatcher.dispatch({
                type: "MESSAGE_DELETE",
                channelId: entry.channelId,
                id: entry.id,
                mlDeleted: true,
            });
        } else {
            updateMessage(entry.channelId, entry.id, { editHistory: [] });
        }
    } catch (e) {
        logger.error("removeEntryFully failed for", entry.id, e);
    }
}

/**
 * Bulk variant: purge all entries matching `predicate` from the DB in one
 * cursor pass, then dispatch in-memory cleanup events for each. Used by the
 * viewer's "Clear log (visible entries)" footer button.
 *
 * Returns the count actually removed from the DB.
 */
export async function removeEntriesFully(entriesToRemove: PersistedMessage[]): Promise<number> {
    if (entriesToRemove.length === 0) return 0;
    const ids = new Set(entriesToRemove.map(e => e.id));
    const dbCount = await purgeMatching(e => ids.has(e.id));

    for (const entry of entriesToRemove) {
        try {
            if (entry.deleted) {
                FluxDispatcher.dispatch({
                    type: "MESSAGE_DELETE",
                    channelId: entry.channelId,
                    id: entry.id,
                    mlDeleted: true,
                });
            } else {
                updateMessage(entry.channelId, entry.id, { editHistory: [] });
            }
        } catch (e) {
            logger.error("removeEntriesFully: in-memory cleanup failed for", entry.id, e);
        }
    }

    return dbCount;
}

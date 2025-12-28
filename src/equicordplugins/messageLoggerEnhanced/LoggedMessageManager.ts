/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Flogger, settings } from ".";
import { addMessageIDB, db, DBMessageStatus, deleteMessagesBulkIDB, getOlderThanTimestampForGuildsIDB, getOldestMessagesIDB } from "./db";
import { LoggedMessage, LoggedMessageJSON } from "./types";
import { cleanupMessage } from "./utils";
import { cacheMessageImages } from "./utils/saveImage";

let lastCleanupTime = 0;
const CLEANUP_COOLDOWN = 60 * 1000;

export const addMessage = async (message: LoggedMessage | LoggedMessageJSON, status: DBMessageStatus, currentChannelId?: string) => {
    if (settings.store.saveImages && status === DBMessageStatus.DELETED)
        await cacheMessageImages(message);
    const finalMessage = cleanupMessage(message);

    await addMessageIDB(finalMessage, status);

    if (settings.store.timeBasedCleanupMinutes > 0) {
        const now = Date.now();
        if (now - lastCleanupTime > CLEANUP_COOLDOWN) {
            lastCleanupTime = now;
            const cutoffTime = new Date(now - settings.store.timeBasedCleanupMinutes * 60 * 1000).toISOString();
            const oldGuildMessages = await getOlderThanTimestampForGuildsIDB(cutoffTime, currentChannelId, settings.store.preserveCurrentChannel);

            if (oldGuildMessages.length > 0) {
                Flogger.info(`Deleting ${oldGuildMessages.length} old server messages older than ${settings.store.timeBasedCleanupMinutes} minutes`);
                await deleteMessagesBulkIDB(oldGuildMessages.map(m => m.message_id));
            }
        }
    }

    if (settings.store.messageLimit > 0) {
        const currentMessageCount = await db.count("messages");
        if (currentMessageCount > settings.store.messageLimit) {
            const messagesToDelete = currentMessageCount - settings.store.messageLimit;
            if (messagesToDelete <= 0 || messagesToDelete >= settings.store.messageLimit) return;

            const oldestMessages = await getOldestMessagesIDB(messagesToDelete);

            Flogger.info(`Deleting ${messagesToDelete} oldest messages`);
            await deleteMessagesBulkIDB(oldestMessages.map(m => m.message_id));
        }
    }
};

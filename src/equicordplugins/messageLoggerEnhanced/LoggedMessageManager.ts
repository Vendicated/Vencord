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

import { createStore } from "@api/DataStore";
import { DataStore } from "@api/index";
import { Settings } from "@api/Settings";

import { Flogger, Native, settings } from ".";
import { LoggedMessage, LoggedMessageIds, LoggedMessageJSON, LoggedMessages, MessageRecord } from "./types";
import { cleanupMessage, getNative, sortMessagesByDate } from "./utils";
import { cacheMessageImages, deleteMessageImages } from "./utils/saveImage";

export const defaultLoggedMessages = { deletedMessages: {}, editedMessages: {}, };

export const LOGGED_MESSAGES_KEY = "logged-messages-hi";
export const MessageLoggerStore = createStore("MessageLoggerData", "MessageLoggerStore");

// this gets used by the logs modal. logs modal should only use saved messages not messages that are being processed
// also hasMessageInLogs should only check saved messages not the ones that are being processed
export let savedLoggedMessages: LoggedMessages = defaultLoggedMessages;

export let loggedMessages: LoggedMessages = defaultLoggedMessages;

(async () => {
    try {
        const Native = getNative();
        const res = await Native.getLogsFromFs();
        if (res != null) {
            Flogger.log("Got logged messages from native wont be checking DataStore");
            const cleaned = await cleanMessages(res, Native);
            loggedMessages = cleaned;
            savedLoggedMessages = cleaned;
            return;
        }

        if (IS_WEB) {
            Flogger.log("hii. no point in checking DataStore if. we already did up there ^^");
            return;
        }

        const data = await DataStore.get(LOGGED_MESSAGES_KEY, MessageLoggerStore);

        if (data == null) {
            Flogger.log("No logged messages in DataStore");
            return;
        }

        Flogger.log("Loading logged messages from DataStore and writing to native");
        Native.writeLogs(JSON.stringify(data));

        loggedMessages = data;
        savedLoggedMessages = res;
    } catch (error) {
        console.error("Error loading logged messages from the store:", error);
    }
})();

// api

export const saveLoggedMessages = async () => {
    if (settings.store.saveMessages) {
        await Native.writeLogs(JSON.stringify(loggedMessages));
    }
    savedLoggedMessages = loggedMessages;
};

export const addMessage = async (message: LoggedMessage | LoggedMessageJSON, key: keyof LoggedMessageIds, isBulk = false) => {
    if (settings.store.saveImages && key === "deletedMessages")
        await cacheMessageImages(message);
    const finalMessage = cleanupMessage(message);
    loggedMessages[message.id] = { message: finalMessage };

    if (!loggedMessages[key][message.channel_id])
        loggedMessages[key][message.channel_id] = [];

    if (!loggedMessages[key][message.channel_id].includes(message.id))
        loggedMessages[key][message.channel_id].push(message.id);

    // if limit is negative or 0 there is no limit
    if (settings.store.messageLimit > 0 && (Object.keys(loggedMessages).length - 2) > settings.store.messageLimit)
        await deleteOldestMessageWithoutSaving(loggedMessages);

    if (!isBulk)
        await saveLoggedMessages();
};


export const removeFromKey = (
    message_id: string,
    channel_id: string,
    loggedMessages: LoggedMessages,
    key: keyof LoggedMessageIds,
) => {
    if (loggedMessages[key][channel_id]) {
        loggedMessages[key][channel_id] = loggedMessages[key][channel_id].filter(msgid => msgid !== message_id);

        if (loggedMessages[key][channel_id].length === 0) {
            delete loggedMessages[key][channel_id];
        }
    }
};

function removeLogWithoutSaving(messageId: string, loggedMessages: LoggedMessages) {
    const record = loggedMessages[messageId];
    if (record) {
        const channel_id = record.message?.channel_id;

        if (channel_id != null) {
            removeFromKey(messageId, channel_id, loggedMessages, "editedMessages");
            removeFromKey(messageId, channel_id, loggedMessages, "deletedMessages");
        }

        delete loggedMessages[messageId];
    }

    return loggedMessages;
}



export async function removeLogs(ids: string[]) {
    for (const msgId of ids) {
        removeLogWithoutSaving(msgId, loggedMessages);
    }
    await saveLoggedMessages();
}

export async function removeLog(id: string) {
    const record = loggedMessages[id];

    if (record?.message)
        deleteMessageImages(record.message);

    removeLogWithoutSaving(id, loggedMessages);

    await saveLoggedMessages();

}

export async function clearLogs() {
    await Native.writeLogs(JSON.stringify(defaultLoggedMessages));
    loggedMessages = defaultLoggedMessages;
    savedLoggedMessages = defaultLoggedMessages;
}


// utils

export const hasMessageInLogs = (messageId: string) => {
    const bruh = Object.values(savedLoggedMessages)
        .filter(m => !Array.isArray(m)) as MessageRecord[];

    return bruh.find(m => m.message?.id === messageId);
};

export const hasLogs = async () => {
    const hasDeletedMessages = Object.keys(loggedMessages.deletedMessages).length > 0;
    const hasEditedMessages = Object.keys(loggedMessages.editedMessages).length > 0;

    const hasMessages = Object.keys(loggedMessages).filter(m => m !== "editedMessages" && m !== "deletedMessages").length > 0;

    if (hasDeletedMessages && hasEditedMessages && hasMessages) return true;

    return false;
};

export function findLoggedChannelByMessageIdSync(messageId: string, loggedMessages: LoggedMessages, key: keyof LoggedMessageIds) {
    for (const channelId in loggedMessages[key]) {
        if (loggedMessages[key][channelId].includes(messageId)) return channelId;
    }

    return null;
}

export async function findLoggedChannelByMessage(messageId: string, key?: keyof LoggedMessageIds): Promise<[string | null, keyof LoggedMessageIds]> {

    if (!key) {
        const id1 = findLoggedChannelByMessageIdSync(messageId, loggedMessages, "deletedMessages");
        if (id1) return [id1, "deletedMessages"];
        const id2 = findLoggedChannelByMessageIdSync(messageId, loggedMessages, "editedMessages");
        return [id2, "editedMessages"];
    }

    return [findLoggedChannelByMessageIdSync(messageId, loggedMessages, key), key];
}


export function getOldestMessage(loggedMessageIds: LoggedMessages) {
    const messags = Object.values(loggedMessageIds)
        .filter(m => !Array.isArray(m) && m.message != null) as MessageRecord[];

    const sortedMessages = messags.sort((a, b) => sortMessagesByDate(a.message.timestamp, b.message.timestamp));

    const oldestMessage = sortedMessages[sortedMessages.length - 1];

    return oldestMessage ?? null;
}

export async function deleteOldestMessageWithoutSaving(loggedMessages: LoggedMessages) {
    const oldestMessage = getOldestMessage(loggedMessages);
    if (!oldestMessage || !oldestMessage.message) {
        console.warn("couldnt find oldest message. oldestMessage == null || oldestMessage.message == null");
        return loggedMessages;
    }

    const { message } = oldestMessage;

    const [channelId, key] = await findLoggedChannelByMessage(message.id);

    if (!channelId || !key) {
        console.warn("couldnt find oldest message. channelId =", channelId, " key =", key);
        return loggedMessages;
    }

    removeLogWithoutSaving(message.id, loggedMessages);
    // console.log("removing", message);

    return loggedMessages;
}

async function cleanMessages(loggedMessages: LoggedMessages, _Native: any = Native) {
    try {
        const cleaned = { ...loggedMessages };

        if (IS_WEB) return cleaned;

        const messageRecords = Object.values(cleaned)
            .filter(m => !Array.isArray(m)) as MessageRecord[];

        let hasChanged = false;
        for (const messageRecord of messageRecords) {
            const { message } = messageRecord;

            if (message?.attachments) {
                for (const attachment of message.attachments) {
                    if (attachment.blobUrl) {
                        hasChanged = true;
                        delete attachment.blobUrl;
                    }
                }
            }
        }

        if (hasChanged)
            await _Native.writeLogs(Settings.plugins.MLEnhanced.logsDir, JSON.stringify(cleaned));

        return cleaned;

    } catch (err) {
        Flogger.error("Error cleaning messages:", err);
        return loggedMessages;
    }
}

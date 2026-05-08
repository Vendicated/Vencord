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

import { Message, MessageAttachment, MessageJSON } from "@vencord/discord-types";

export interface LoggedAttachment extends MessageAttachment {
    fileExtension?: string | null;
    path?: string | null;
    blobUrl?: string;
    nativefileSystem?: boolean;
    oldUrl?: string;
    oldProxyUrl?: string;
}

export type RefrencedMessage = LoggedMessageJSON & { message_id: string; };
export interface LoggedMessageJSON extends Omit<LoggedMessage, "timestamp"> {
    mention_everyone?: string;
    guildId?: string;
    guild_id?: string;
    ghostPinged?: boolean;
    timestamp: string;
    ourCache?: boolean;
    referenced_message: RefrencedMessage;
    message_reference: RefrencedMessage;
}

export interface LoggedMessage extends Message {
    attachments: LoggedAttachment[];
    deleted?: boolean;
    deletedTimestamp?: string;
    editHistory?: {
        timestamp: string;
        content: string;
    }[];
}

export interface MessageDeletePayload {
    type: string;
    guildId: string;
    id: string;
    channelId: string;
    mlDeleted?: boolean;
}

export interface MessageDeleteBulkPayload {
    type: string;
    guildId: string;
    ids: string[];
    channelId: string;
}


export interface MessageUpdatePayload {
    type: string;
    guildId: string;
    message: MessageJSON;
}

export interface MessageCreatePayload {
    type: string;
    guildId: string;
    channelId: string;
    message: MessageJSON;
    optimistic: boolean;
    isPushNotification: boolean;
}

export interface LoadMessagePayload {
    type: string;
    channelId: string;
    messages: LoggedMessageJSON[];
    isBefore: boolean;
    isAfter: boolean;
    hasMoreBefore: boolean;
    hasMoreAfter: boolean;
    limit: number;
    isStale: boolean;
}

export interface FetchMessagesResponse {
    ok: boolean;
    headers: Headers;
    body: LoggedMessageJSON[] & {
        extra?: LoggedMessageJSON[];
    };
    text: string;
    status: number;
}

export interface PatchAttachmentItem {
    uniqueId: string;
    originalItem: LoggedAttachment;
    type: string;
    downloadUrl: string;
    height: number;
    width: number;
    spoiler: boolean;
    contentType: string;
}

export interface AttachmentData {
    messageId: string;
    attachmentId: string;
}

export type SavedImages = Record<string, AttachmentData>;

export type LoggedMessageIds = {
    // [channel_id: string]: message_id
    deletedMessages: Record<string, string[]>;
    editedMessages: Record<string, string[]>;
};

export type MessageRecord = { message: LoggedMessageJSON; };

export type LoggedMessages = LoggedMessageIds & { [message_id: string]: { message?: LoggedMessageJSON; }; };

export type GitValue = {
    value: any;
    stderr?: string;
    ok: true;
};

export type GitError = {
    ok: false;
    cmd: string;
    message: string;
    error: any;
};

export type GitResult = GitValue | GitError;

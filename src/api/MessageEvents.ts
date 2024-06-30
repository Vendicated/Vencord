/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Logger } from "@utils/Logger";
import type { ChannelRecord, GuildEmoji, MessageRecord, MessageReference } from "@vencord/discord-types";
import { MessageStore } from "@webpack/common";
import type { Promisable } from "type-fest";

const MessageEventsLogger = new Logger("MessageEvents", "#e5c890");

export interface MessageObject {
    content: string,
    validNonShortcutEmojis: GuildEmoji[];
    invalidEmojis: any[];
    tts: boolean;
}

// Actually a class
export interface CloudUpload {
    classification: string;
    currentSize: number;
    description: string | null;
    filename: string;
    id: string;
    isImage: boolean;
    isVideo: boolean;
    item: {
        file: File;
        platform: UploadPlatform;
    };
    loaded: number;
    mimeType: string;
    preCompressionSize: number;
    responseUrl: string;
    sensitive: boolean;
    showLargeMessageDialog: boolean;
    spoiler: boolean;
    status: CloudUploadStatus;
    uniqueId: string;
    uploadedFilename: string;
}

export const enum UploadPlatform {
    REACT_NATIVE = 0,
    WEB = 1,
}

export const enum CloudUploadStatus {
    CANCELED = "CANCELED",
    COMPLETED = "COMPLETED",
    ERROR = "ERROR",
    NOT_STARTED = "NOT_STARTED",
    STARTED = "STARTED",
    UPLOADING = "UPLOADING",
}

export interface MessageReplyOptions {
    messageReference: MessageReference;
    allowedMentions?: {
        parse: string[];
        repliedUser: boolean;
    };
}

export interface MessageExtra {
    stickers?: string[];
    uploads?: CloudUpload[];
    replyOptions: MessageReplyOptions;
    content: string;
    channel: ChannelRecord;
    type?: any;
    openWarningPopout: (props: any) => any;
}

export type SendListener = (channelId: string, messageObj: MessageObject, extra: MessageExtra) => Promisable<{ cancel: boolean; } | void>;
export type EditListener = (channelId: string, messageId: string, messageObj: MessageObject) => Promisable<{ cancel: boolean; } | void>;

const sendListeners = new Set<SendListener>();
const editListeners = new Set<EditListener>();

export async function _handlePreSend(channelId: string, messageObj: MessageObject, extra: MessageExtra, replyOptions: MessageReplyOptions) {
    extra.replyOptions = replyOptions;
    for (const listener of sendListeners) {
        try {
            const result = await listener(channelId, messageObj, extra);
            if (result?.cancel) {
                return true;
            }
        } catch (e) {
            MessageEventsLogger.error("MessageSendHandler: Listener encountered an unknown error\n", e);
        }
    }
    return false;
}

export async function _handlePreEdit(channelId: string, messageId: string, messageObj: MessageObject) {
    for (const listener of editListeners) {
        try {
            const result = await listener(channelId, messageId, messageObj);
            if (result?.cancel) {
                return true;
            }
        } catch (e) {
            MessageEventsLogger.error("MessageEditHandler: Listener encountered an unknown error\n", e);
        }
    }
    return false;
}

/**
 * Note: This event fires off before a message is sent, allowing you to edit the message.
 */
export function addPreSendListener(listener: SendListener) {
    sendListeners.add(listener);
    return listener;
}
/**
 * Note: This event fires off before a message's edit is applied, allowing you to further edit the message.
 */
export function addPreEditListener(listener: EditListener) {
    editListeners.add(listener);
    return listener;
}
export function removePreSendListener(listener: SendListener) {
    return sendListeners.delete(listener);
}
export function removePreEditListener(listener: EditListener) {
    return editListeners.delete(listener);
}


// Message clicks
type ClickListener = (message: MessageRecord, channel: ChannelRecord, event: MouseEvent) => void;

const listeners = new Set<ClickListener>();

export function _handleClick(message: MessageRecord, channel: ChannelRecord, event: MouseEvent) {
    // message object may be outdated, so (try to) fetch latest one
    message = MessageStore.getMessage(channel.id, message.id) ?? message;
    for (const listener of listeners) {
        try {
            listener(message, channel, event);
        } catch (e) {
            MessageEventsLogger.error("MessageClickHandler: Listener encountered an unknown error\n", e);
        }
    }
}

export function addClickListener(listener: ClickListener) {
    listeners.add(listener);
    return listener;
}

export function removeClickListener(listener: ClickListener) {
    return listeners.delete(listener);
}

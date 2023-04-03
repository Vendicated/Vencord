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

import Logger from "@utils/Logger";
import { MessageStore } from "@webpack/common";
import type { Channel, Message } from "discord-types/general";
import type { Promisable } from "type-fest";

const MessageEventsLogger = new Logger("MessageEvents", "#e5c890");

export interface Emoji {
    require_colons: boolean,
    originalName: string,
    animated: boolean;
    guildId: string,
    name: string,
    url: string,
    id: string,
}

export interface MessageObject {
    content: string,
    validNonShortcutEmojis: Emoji[];
}

export interface MessageExtra {
    stickerIds?: string[];
}

export type SendListener = (channelId: string, messageObj: MessageObject, extra: MessageExtra) => Promisable<void | { cancel: boolean; }>;
export type EditListener = (channelId: string, messageId: string, messageObj: MessageObject) => Promisable<void>;

const sendListeners = new Set<SendListener>();
const editListeners = new Set<EditListener>();

export async function _handlePreSend(channelId: string, messageObj: MessageObject, extra: MessageExtra) {
    for (const listener of sendListeners) {
        try {
            const result = await listener(channelId, messageObj, extra);
            if (result && result.cancel === true) {
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
            await listener(channelId, messageId, messageObj);
        } catch (e) {
            MessageEventsLogger.error("MessageEditHandler: Listener encountered an unknown error\n", e);
        }
    }
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
type ClickListener = (message: Message, channel: Channel, event: MouseEvent) => void;

const listeners = new Set<ClickListener>();

export function _handleClick(message: Message, channel: Channel, event: MouseEvent) {
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

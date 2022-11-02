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

import type { Channel,Message } from "discord-types/general";

import Logger from "../utils/logger";

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

export type SendListener = (channelId: string, messageObj: MessageObject, extra: any) => void;
export type EditListener = (channelId: string, messageId: string, messageObj: MessageObject) => void;

const sendListeners = new Set<SendListener>();
const editListeners = new Set<EditListener>();

export function _handlePreSend(channelId: string, messageObj: MessageObject, extra: any) {
    for (const listener of sendListeners) {
        try {
            listener(channelId, messageObj, extra);
        } catch (e) { MessageEventsLogger.error(`MessageSendHandler: Listener encountered an unknown error. (${e})`); }
    }
}

export function _handlePreEdit(channelId: string, messageId: string, messageObj: MessageObject) {
    for (const listener of editListeners) {
        try {
            listener(channelId, messageId, messageObj);
        } catch (e) { MessageEventsLogger.error(`MessageEditHandler: Listener encountered an unknown error. (${e})`); }
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
    for (const listener of listeners) {
        try {
            listener(message, channel, event);
        } catch (e) { MessageEventsLogger.error(`MessageClickHandler: Listener encountered an unknown error. (${e})`); }
    }
}

export function addClickListener(listener: ClickListener) {
    listeners.add(listener);
    return listener;
}

export function removeClickListener(listener: ClickListener) {
    return listeners.delete(listener);
}

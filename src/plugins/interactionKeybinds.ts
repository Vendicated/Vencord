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

import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";
import { FluxDispatcher as Dispatcher, ChannelStore, SelectedChannelStore, UserStore } from "../webpack/common";
import { filters } from "../webpack";
import { lazyWebpack } from "../utils/misc";
import { Message } from "discord-types/general";

const MessageStore = lazyWebpack(filters.byProps(["getRawMessages"]));

const isMac = navigator.platform.includes("Mac"); // bruh
let replyIdx = -1;
let editIdx = -1;

export default definePlugin({
    name: "InteractionKeybinds",
    authors: [Devs.obscurity, Devs.Ven],
    description: "Reply to (ctrl + up/down) and edit (ctrl + shift + up/down) messages via keybinds",

    start() {
        Dispatcher.subscribe("DELETE_PENDING_REPLY", onDeletePendingReply);
        Dispatcher.subscribe("MESSAGE_END_EDIT", onEndEdit);
        Dispatcher.subscribe("MESSAGE_START_EDIT", onStartEdit);
        Dispatcher.subscribe("CREATE_PENDING_REPLY", onCreatePendingReply);
        document.addEventListener("keydown", onKeydown);
    },

    stop() {
        Dispatcher.unsubscribe("DELETE_PENDING_REPLY", onDeletePendingReply);
        Dispatcher.unsubscribe("MESSAGE_END_EDIT", onEndEdit);
        Dispatcher.unsubscribe("MESSAGE_START_EDIT", onStartEdit);
        Dispatcher.unsubscribe("CREATE_PENDING_REPLY", onCreatePendingReply);
        document.removeEventListener("keydown", onKeydown);
    },
});

const onDeletePendingReply = () => replyIdx = -1;
const onEndEdit = () => editIdx = -1;

function calculateIdx(messages: Message[], id: string) {
    const idx = messages.findIndex(m => m.id === id);
    return idx === -1
        ? idx
        : messages.length - idx - 1;
}

function onStartEdit({ channelId, messageId, _isQuickEdit }: any) {
    if (_isQuickEdit) return;

    const meId = UserStore.getCurrentUser().id;

    const messages = MessageStore.getMessages(channelId)._array.filter(m => m.author.id === meId);
    editIdx = calculateIdx(messages, messageId);
}

function onCreatePendingReply({ message, _isQuickReply }: { message: Message; _isQuickReply: boolean; }) {
    if (_isQuickReply) return;

    replyIdx = calculateIdx(MessageStore.getMessages(message.channel_id)._array, message.id);
}

const isCtrl = (e: KeyboardEvent) => isMac ? e.metaKey : e.ctrlKey;
const isAltOrMeta = (e: KeyboardEvent) => e.altKey || (!isMac && e.metaKey);

function onKeydown(e: KeyboardEvent) {
    const isUp = e.key === "ArrowUp";
    if (!isUp && e.key !== "ArrowDown") return;
    if (!isCtrl(e) || isAltOrMeta(e)) return;

    if (e.shiftKey)
        nextEdit(isUp);
    else
        nextReply(isUp);
}

function getNextMessage(isUp: boolean, isReply: boolean) {
    let messages: Message[] = MessageStore.getMessages(SelectedChannelStore.getChannelId())._array;
    if (!isReply) { // we are editing so only include own
        const meId = UserStore.getCurrentUser().id;
        messages = messages.filter(m => m.author.id === meId);
    }

    const mutate = (i: number) => isUp
        ? Math.min(messages.length - 1, i + 1)
        : Math.max(-1, i - 1);

    let i: number;
    if (isReply)
        replyIdx = i = mutate(replyIdx);
    else
        editIdx = i = mutate(editIdx);

    return i === - 1 ? undefined : messages[messages.length - i - 1];
}

// handle next/prev reply
function nextReply(isUp: boolean) {
    const message = getNextMessage(isUp, true);

    if (!message)
        return void Dispatcher.dispatch({
            type: "DELETE_PENDING_REPLY",
            channelId: SelectedChannelStore.getChannelId(),
        });

    const channel = ChannelStore.getChannel(message.channel_id);
    const meId = UserStore.getCurrentUser().id;
    Dispatcher.dispatch({
        type: "CREATE_PENDING_REPLY",
        channel,
        message,
        shouldMention: true,
        showMentionToggle: channel.guild_id !== null && message.author.id !== meId,
        _isQuickReply: true
    });
}

// handle next/prev edit
function nextEdit(isUp: boolean) {
    const message = getNextMessage(isUp, false);

    if (!message)
        Dispatcher.dispatch({
            type: "MESSAGE_END_EDIT",
            channelId: SelectedChannelStore.getChannelId()
        });
    else
        Dispatcher.dispatch({
            type: "MESSAGE_START_EDIT",
            channelId: message.channel_id,
            messageId: message.id,
            content: message.content,
            _isQuickEdit: true
        });
}

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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, ComponentDispatch, FluxDispatcher as Dispatcher, MessageActions, MessageStore, PermissionsBits, PermissionStore, SelectedChannelStore, UserStore } from "@webpack/common";
import { Message } from "discord-types/general";
import NoBlockedMessagesPlugin from "plugins/noBlockedMessages";
import NoReplyMentionPlugin from "plugins/noReplyMention";

const isMac = navigator.platform.includes("Mac"); // bruh
let currentlyReplyingId: string | null = null;
let currentlyEditingId: string | null = null;

const enum MentionOptions {
    DISABLED,
    ENABLED,
    NO_REPLY_MENTION_PLUGIN
}

const settings = definePluginSettings({
    shouldMention: {
        type: OptionType.SELECT,
        description: "Ping reply by default",
        options: [
            {
                label: "Follow NoReplyMention",
                value: MentionOptions.NO_REPLY_MENTION_PLUGIN,
                default: true
            },
            { label: "Enabled", value: MentionOptions.ENABLED },
            { label: "Disabled", value: MentionOptions.DISABLED },
        ]
    }
});

export default definePlugin({
    name: "QuickReply",
    authors: [Devs.fawn, Devs.Ven, Devs.pylix],
    description: "Reply to (ctrl + up/down) and edit (ctrl + shift + up/down) messages via keybinds",
    settings,

    start() {
        document.addEventListener("keydown", onKeydown);
    },

    stop() {
        document.removeEventListener("keydown", onKeydown);
    },

    flux: {
        DELETE_PENDING_REPLY() {
            currentlyReplyingId = null;
        },
        MESSAGE_END_EDIT() {
            currentlyEditingId = null;
        },
        CHANNEL_SELECT() {
            currentlyReplyingId = null;
            currentlyEditingId = null;
        },
        MESSAGE_START_EDIT: onStartEdit,
        CREATE_PENDING_REPLY: onCreatePendingReply
    }
});

function onStartEdit({ messageId, _isQuickEdit }: any) {
    if (_isQuickEdit) return;
    currentlyEditingId = messageId;
}

function onCreatePendingReply({ message, _isQuickReply }: { message: Message; _isQuickReply: boolean; }) {
    if (_isQuickReply) return;

    currentlyReplyingId = message.id;
}

const isCtrl = (e: KeyboardEvent) => isMac ? e.metaKey : e.ctrlKey;
const isAltOrMeta = (e: KeyboardEvent) => e.altKey || (!isMac && e.metaKey);

function onKeydown(e: KeyboardEvent) {
    const isUp = e.key === "ArrowUp";
    if (!isUp && e.key !== "ArrowDown") return;
    if (!isCtrl(e) || isAltOrMeta(e)) return;

    e.preventDefault();

    if (e.shiftKey)
        nextEdit(isUp);
    else
        nextReply(isUp);
}

function jumpIfOffScreen(channelId: string, messageId: string) {
    const element = document.getElementById("message-content-" + messageId);
    if (!element) return;

    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight);
    const rect = element.getBoundingClientRect();
    const isOffscreen = rect.bottom < 150 || rect.top - vh >= -150;

    if (isOffscreen) {
        MessageActions.jumpToMessage({
            channelId,
            messageId,
            flash: false,
            jumpType: "INSTANT"
        });
    }
}

function getNextMessage(isUp: boolean, isReply: boolean) {
    let messages: Array<Message & { deleted?: boolean; }> = MessageStore.getMessages(SelectedChannelStore.getChannelId())._array;

    const meId = UserStore.getCurrentUser().id;
    const hasNoBlockedMessages = Vencord.Plugins.isPluginEnabled(NoBlockedMessagesPlugin.name);

    messages = messages.filter(m => {
        if (m.deleted) return false;
        if (!isReply && m.author.id !== meId) return false; // editing only own messages
        if (hasNoBlockedMessages && NoBlockedMessagesPlugin.shouldIgnoreMessage(m)) return false;

        return true;
    });

    const findNextNonDeleted = (id: string | null) => {
        if (id === null) return messages[messages.length - 1];

        const idx = messages.findIndex(m => m.id === id);
        if (idx === -1) return messages[messages.length - 1];

        const i = isUp ? idx - 1 : idx + 1;
        return messages[i] ?? null;
    };

    if (isReply) {
        const msg = findNextNonDeleted(currentlyReplyingId);
        currentlyReplyingId = msg?.id ?? null;
        return msg;
    } else {
        const msg = findNextNonDeleted(currentlyEditingId);
        currentlyEditingId = msg?.id ?? null;
        return msg;
    }
}

function shouldMention(message: Message) {
    switch (settings.store.shouldMention) {
        case MentionOptions.NO_REPLY_MENTION_PLUGIN:
            if (!Vencord.Plugins.isPluginEnabled(NoReplyMentionPlugin.name)) return true;
            return NoReplyMentionPlugin.shouldMention(message, false);
        case MentionOptions.DISABLED:
            return false;
        default:
            return true;
    }
}

// handle next/prev reply
function nextReply(isUp: boolean) {
    const currChannel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
    if (currChannel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, currChannel)) return;

    const message = getNextMessage(isUp, true);

    if (!message) {
        return void Dispatcher.dispatch({
            type: "DELETE_PENDING_REPLY",
            channelId: SelectedChannelStore.getChannelId(),
        });
    }

    const channel = ChannelStore.getChannel(message.channel_id);
    const meId = UserStore.getCurrentUser().id;

    Dispatcher.dispatch({
        type: "CREATE_PENDING_REPLY",
        channel,
        message,
        shouldMention: shouldMention(message),
        showMentionToggle: !channel.isPrivate() && message.author.id !== meId,
        _isQuickReply: true
    });

    ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
    jumpIfOffScreen(channel.id, message.id);
}

// handle next/prev edit
function nextEdit(isUp: boolean) {
    const currChannel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
    if (currChannel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, currChannel)) return;
    const message = getNextMessage(isUp, false);

    if (!message) {
        return Dispatcher.dispatch({
            type: "MESSAGE_END_EDIT",
            channelId: SelectedChannelStore.getChannelId()
        });
    }

    Dispatcher.dispatch({
        type: "MESSAGE_START_EDIT",
        channelId: message.channel_id,
        messageId: message.id,
        content: message.content,
        _isQuickEdit: true
    });

    jumpIfOffScreen(message.channel_id, message.id);
}

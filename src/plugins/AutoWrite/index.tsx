/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, MessageActions } from "@webpack/common";

import { buildAutoWriteModal } from "./components/AutoWriteModal";

const settings = definePluginSettings({
    messages: {
        type: OptionType.STRING,
        default: "",
        description: "Messages to send (one per line)"
    },
    cooldown: {
        type: OptionType.NUMBER,
        default: 1000,
        description: "Cooldown between messages (milliseconds)"
    },
    mode: {
        type: OptionType.SELECT,
        description: "Send mode",
        options: [
            { label: "Sequential (Loop)", value: "sequential", default: true },
            { label: "Random", value: "random" },
            { label: "Send All Once", value: "once" }
        ]
    }
});

// Auto-write state
let isAutoWriting = false;
let autoWriteInterval: any = null;
let currentMessageIndex = 0;
let sentMessagesSet = new Set<number>();

function AutoWriteIcon() {
    return (
        <svg
            aria-hidden
            role="img"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            style={{ scale: "1.2", translate: "0 -1px" }}
        >
            <path
                fill="currentColor"
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
            />
        </svg>
    );
}

const ChatBarIcon: ChatBarButtonFactory = ({ isMainChat, channel }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Auto Write"
            onClick={() => buildAutoWriteModal(channel)}
            buttonProps={{
                "aria-haspopup": "dialog",
            }}
        >
            <AutoWriteIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "AutoWrite",
    description: "Automatically send messages with customizable modes and cooldown",
    authors:  [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "go.ld8",
        id: 1413154958832046151n
}],
    settings,

    renderChatBarButton: ChatBarIcon,

    stop() {
        stopAutoWrite();
    }
});

export function sendMessage(channelId: string, content: string) {
    MessageActions.sendMessage(
        channelId,
        {
            validNonShortcutEmojis: [],
            content
        },
        undefined,
        {}
    );
}

export function startAutoWrite(channelId: string) {
    if (isAutoWriting) return;

    const messagesText = settings.store.messages;
    const cooldown = settings.store.cooldown || 1000;
    const mode = settings.store.mode;

    if (!messagesText || !messagesText.trim()) {
        return;
    }

    const messages = messagesText
        .split("\n")
        .map(msg => msg.trim())
        .filter(msg => msg.length > 0);

    if (messages.length === 0) return;

    isAutoWriting = true;
    currentMessageIndex = 0;
    sentMessagesSet.clear();

    if (mode === "once") {
        // Send all messages once
        let index = 0;
        autoWriteInterval = setInterval(() => {
            if (index >= messages.length) {
                stopAutoWrite();
                return;
            }
            sendMessage(channelId, messages[index]);
            index++;
        }, cooldown);
    } else if (mode === "random") {
        // Send random messages until all are sent
        const availableIndices = Array.from({ length: messages.length }, (_, i) => i);
        
        autoWriteInterval = setInterval(() => {
            if (availableIndices.length === 0) {
                stopAutoWrite();
                return;
            }
            
            const randomIndex = Math.floor(Math.random() * availableIndices.length);
            const messageIndex = availableIndices[randomIndex];
            
            sendMessage(channelId, messages[messageIndex]);
            
            availableIndices.splice(randomIndex, 1);
        }, cooldown);
    } else {
        // Sequential loop
        autoWriteInterval = setInterval(() => {
            sendMessage(channelId, messages[currentMessageIndex]);
            currentMessageIndex = (currentMessageIndex + 1) % messages.length;
        }, cooldown);
    }
}

export function stopAutoWrite() {
    if (autoWriteInterval) {
        clearInterval(autoWriteInterval);
        autoWriteInterval = null;
    }
    isAutoWriting = false;
    currentMessageIndex = 0;
    sentMessagesSet.clear();
}

export function isAutoWriteActive(): boolean {
    return isAutoWriting;
}

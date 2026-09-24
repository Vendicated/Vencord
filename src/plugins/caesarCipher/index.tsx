/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ChatBarButton } from "@api/ChatButtons";
import {
    MessageEditListener,
    MessageSendListener
} from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, React, useEffect, useState } from "@webpack/common";

const SHIFT = 3;

/* =========================
   Settings
   ========================= */

const stateListeners = new Set<() => void>();

const settings = definePluginSettings({
    autoCaesar: {
        displayName: "Caesar Cipher",
        description: "Automatically encrypt your messages before sending.",
        type: OptionType.BOOLEAN,
        default: false,

        onChange() {
            notifyStateListeners();
        }
    }
});

/* =========================
   Caesar Cipher
   ========================= */

function caesar(text: string, shift: number): string {
    return text.replace(/[A-Za-z]/g, char => {
        const base = char >= "a" && char <= "z" ? 97 : 65;

        return String.fromCharCode(
            ((char.charCodeAt(0) - base + shift + 26) % 26) + base
        );
    });
}

function encrypt(text: string): string {
    return caesar(text, -SHIFT);
}

function decrypt(text: string): string {
    return caesar(text, SHIFT);
}

/* =========================
   Caesar State
   ========================= */

function notifyStateListeners() {
    for (const listener of stateListeners) {
        listener();
    }
}

function toggleCaesar() {
    settings.store.autoCaesar = !settings.store.autoCaesar;
    notifyStateListeners();
}

function useCaesarEnabled() {
    const [enabled, setEnabled] = useState(
        settings.store.autoCaesar
    );

    useEffect(() => {
        const listener = () => {
            setEnabled(settings.store.autoCaesar);
        };

        stateListeners.add(listener);

        return () => {
            stateListeners.delete(listener);
        };
    }, []);

    return enabled;
}

/* =========================
   Translation State
   ========================= */

const translatedMessages = new Set<string>();
const translationListeners = new Set<() => void>();

function notifyTranslationListeners() {
    for (const listener of translationListeners) {
        listener();
    }
}

function toggleTranslation(messageId: string) {
    if (translatedMessages.has(messageId)) {
        translatedMessages.delete(messageId);
    } else {
        translatedMessages.add(messageId);
    }

    notifyTranslationListeners();
}

function dismissTranslation(messageId: string) {
    translatedMessages.delete(messageId);
    notifyTranslationListeners();
}

function useTranslationState(messageId: string) {
    const [translated, setTranslated] = useState(
        translatedMessages.has(messageId)
    );

    useEffect(() => {
        const listener = () => {
            setTranslated(translatedMessages.has(messageId));
        };

        translationListeners.add(listener);

        return () => {
            translationListeners.delete(listener);
        };
    }, [messageId]);

    return translated;
}

/* =========================
   Caesar Icon
   ========================= */

function CaesarIcon(_props: any) {
    const active = useCaesarEnabled();

    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={active ? "vc-caesarcipher-active-icon" : ""}
        >
            <path
                d="M5 5h14M8 5l-3 14M16 5l3 14M7 15h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <path
                d="M9 9h6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

/* =========================
   Caesar Chat Button
   ========================= */

function CaesarChatBarButton() {
    const active = useCaesarEnabled();

    return (
        <ChatBarButton
            tooltip={
                active
                    ? "Caesar Cipher Enabled"
                    : "Enable Caesar Cipher"
            }
            onClick={() => {
                toggleCaesar();
            }}
        >
            <CaesarIcon />
        </ChatBarButton>
    );
}

/* =========================
   Translation Icon
   ========================= */

function TranslateIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M4 5h9M8 5c0 4-2 7-5 9M5 9c2 2 4 4 7 5M15 13h5M17.5 10l-3.5 9M15.5 16h4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/* =========================
   Translation Icon
   ========================= */

function CaesarTranslationIcon() {
    return (
        <svg
            className="vc-caesarcipher-translation-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M5 5h14M8 5l-3 14M16 5l3 14M7 15h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <path
                d="M9 9h6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

/* =========================
   Translation Display
   ========================= */

function CaesarTranslation({ message }: { message: any; }) {
    const translated = useTranslationState(message.id);

    if (!translated || !message.content) {
        return null;
    }

    return (
        <div className="vc-caesarcipher-translation">
            <div className="vc-caesarcipher-result">
                <CaesarTranslationIcon />

                <span>{decrypt(message.content)}</span>
            </div>

            <div className="vc-caesarcipher-info">
                <span>translated from Caesar Cipher</span>

                <button
                    className="vc-caesarcipher-dismiss"
                    onClick={() => dismissTranslation(message.id)}
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}

/* =========================
   Message Encryption
   ========================= */

const encryptMessage: MessageSendListener = (_channelId, message) => {
    if (!settings.store.autoCaesar) return;
    if (!message.content) return;

    message.content = encrypt(message.content);
};

const encryptEditedMessage: MessageEditListener = (
    _channelId,
    _messageId,
    message
) => {
    if (!settings.store.autoCaesar) return;
    if (!message.content) return;

    message.content = encrypt(message.content);
};

/* =========================
   Plugin
   ========================= */

export default definePlugin({
    name: "CaesarCipher",

    description:
        "Toggle Caesar Cipher encryption from the Discord chat bar.",

    authors: [
        {
            name: "Moses666",
            id: 963995572296101938n
        }
    ],

    settings,

    dependencies: [
        "MessageEventsAPI",
        "ChatInputButtonAPI"
    ],

    onBeforeMessageSend: encryptMessage,

    onBeforeMessageEdit: encryptEditedMessage,

    chatBarButton: {
        icon: CaesarIcon,
        render: CaesarChatBarButton
    },

    messagePopoverButton: {
        icon: TranslateIcon,

        render(message) {
            if (!message?.content) return null;

            const channel = ChannelStore.getChannel(message.channel_id);

            if (!channel) return null;

            return {
                label: "Translate Caesar Cipher",
                icon: TranslateIcon,
                message,
                channel,

                onClick() {
                    toggleTranslation(message.id);
                }
            };
        }
    },

    renderMessageAccessory(props) {
        if (!props.message?.content) return null;

        return (
            <CaesarTranslation
                message={props.message}
            />
        );
    }
});

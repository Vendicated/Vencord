/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    addChatBarButton,
    ChatBarButton,
    removeChatBarButton,
} from "@api/ChatButtons";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    replaceMessageContents: {
        description:
            "Enable this to replace the message contents with the translated message",
        type: OptionType.BOOLEAN,
        default: true,
    },
});

function cartize(input: string): string {
    /**
     * @typedef {Object} CharRule
     * @property {boolean} toUppercase - Whether to convert the character to uppercase
     * @property {string} replacement - Replacement string for the character (if applicable)
     */
    const charRules = {
        for: {
            toUppercase: false,
            replacement: randomInt(1, 9) !== 5 ? "4" : null,
        },
        e: { toUppercase: randomInt(1, 2) === 2, replacement: "3" },
        o: { toUppercase: false, replacement: "0" },
    };

    const wordArr = input.split(" ");
    const newString: string[] = [];

    for (const word of wordArr) {
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const prevChar = word[i - 1] || "";
            const nextChar = word[i + 1] || "";

            const rule = charRules[char.toLowerCase()]; // Apply specific rules
            const toUppercase =
                rule?.toUppercase ?? isUpperCaseMatch(char, prevChar, nextChar);
            const replacement = rule?.replacement ?? char;

            newString.push(
                toUppercase
                    ? replacement.toUpperCase()
                    : replacement.toLowerCase()
            );
        }

        const spaceReplacement = getRandomSymbol([" . ", " > ", " ! ", " "]);
        newString.push(spaceReplacement);
    }

    const emoji = getRandomEmoji(["", "", " "]);
    newString.push(emoji);

    return newString.join("");
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomSymbol(symbols: string[]): string {
    return symbols[randomInt(0, symbols.length - 1)];
}

function getRandomEmoji(emojis: string[]): string {
    return emojis[randomInt(0, emojis.length - 1)];
}

function isUpperCaseMatch(
    char: string,
    prevChar: string,
    nextChar: string
): boolean {
    return (
        char.toUpperCase() === prevChar.toUpperCase() ||
        char.toUpperCase() === nextChar.toUpperCase()
    );
}

const ChatBarIcon: ChatBarButton = ({ isMainChat }) => {
    if (!isMainChat) return null;
    return (
        <ChatBarButton
            tooltip="Enable/Disable Cartinese"
            onClick={() => {
                settings.store.replaceMessageContents =
                    !settings.store.replaceMessageContents;
            }}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                aria-hidden="true"
                role="img"
                width="24"
                height="24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5"
                />
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "Cartinese",
    description: "Automatically translate messages to Cartinese",
    authors: [
        {
            id: 785248634458996767n,
            name: "brnapt",
        },
    ],
    dependencies: ["MessageEventsAPI", "ChatInputButtonAPI"],
    patches: [],
    start() {
        addChatBarButton("SendTimestamps", ChatBarIcon);
        this.listener = addPreSendListener((_, msg) => {
            if (settings.store.replaceMessageContents) {
                msg.content = cartize(msg.content);
            }
        });
    },
    stop() {
        removeChatBarButton("SendTimestamps");
        removePreSendListener(this.listener);
    },
    settings,
});

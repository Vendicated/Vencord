/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

type WordMatch = {
    word: string,
    startIndex: number,
};

const settings = definePluginSettings({
    showIcon: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show a button to toggle the Ingtoninator plugin",
        restartNeeded: true
    },
    isEnabled: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Enable or disable the Ingtoninator"
    }
});

const isLegal = (word: string): boolean => {
    if (word === "i" || word === "I") return false;

    const lastChar = word.slice(-1).toLowerCase();
    if (["a", "e", "o", "u", "y"].includes(lastChar)) return false;

    return true;
};

const getWords = (string: string): WordMatch[] => {
    const linkRegex = /https?:\/\/[^\s]+\.[^\s]+/g;
    const linkRanges = new Set<number>();

    for (const match of string.matchAll(linkRegex)) {
        const start = match.index!;
        const end = start + match[0].length;
        for (let i = start; i < end; i++) {
            linkRanges.add(i);
        }
    }

    return Array.from(string.matchAll(/[\p{L}]+/gu), match => ({
        word: match[0],
        startIndex: match.index!
    })).filter(match => !linkRanges.has(match.startIndex));
};

const chooseRandomWord = (message: string): WordMatch | null => {
    const words: WordMatch[] = getWords(message);

    while (words.length > 0) {
        const index: number = Math.floor(Math.random() * words.length);
        const wordMatch: WordMatch = words[index];

        if (!isLegal(wordMatch.word)) {
            words.splice(index, 1);
            continue;
        }

        return wordMatch;
    }

    return null;
};

const ington = (word: string): string => {
    if (word.endsWith("INGTON")) return "";
    if (word.endsWith("INGTO")) return "N";
    if (word.endsWith("INGT")) return "ON";
    if (word.endsWith("ING")) return "TON";
    if (word.endsWith("IN")) return "GTON";
    if (word.endsWith("I")) return "NGTON";
    return "INGTON";
};

const handleMessage = ((channelId, message) => {
    if (!settings.store.isEnabled) return;

    const msg = message.content;
    if (!msg || !msg.trim()) return;

    const wordMatch: WordMatch | null = chooseRandomWord(msg);
    if (wordMatch === null) return;

    const { word } = wordMatch;
    const wordUpper = word.toUpperCase();
    const isUpper = word === wordUpper;

    let insertion = ington(wordUpper);
    if (!isUpper) {
        insertion = insertion.toLowerCase();
    }

    const idx: number = wordMatch.startIndex + word.length;
    message.content = msg.slice(0, idx) + insertion + msg.slice(idx);
});

const IngtoninatorButton: ChatBarButtonFactory = ({ isMainChat }) => {
    const { isEnabled, showIcon } = settings.use(["isEnabled", "showIcon"]);
    const toggle = () => settings.store.isEnabled = !settings.store.isEnabled;

    if (!isMainChat || !showIcon) return null;

    return (
        <ChatBarButton
            tooltip={isEnabled ? "Ingtoninator Enabled" : "Ingtoninator Disabled"}
            onClick={toggle}
        >
            {isEnabled ? (
                enabledIcon()
            ) : (
                disabledIcon()
            )}
        </ChatBarButton>
    );
};

function enabledIcon() {
    return (
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
            <path transform="translate(351 -153)" fill="currentcolor" d="M-177.7,334.5c6.3-2.3,12.6-5.2,19.8-8.6c31.9-16.4,51.7-41.7,51.7-41.7s-32.5,0.6-64.4,17 c-4,1.7-7.5,4-10.9,5.7c5.7-7.5,12.1-16.4,18.7-25c25-37.1,31.3-77.3,31.3-77.3s-34.8,21-59.2,58.6c-5.2,7.5-9.8,14.9-13.8,22.7 c1.1-10.3,1.1-22.1,1.1-33.6c0-50-19.8-91.1-19.8-91.1s-19.8,40.5-19.8,91.1c0,12.1,0.6,23.3,1.1,33.6c-4-7.5-8.6-14.9-13.8-22.7 c-25-37.1-59.2-58.6-59.2-58.6s6.3,40,31.3,77.3c6.3,9.2,12.1,17.5,18.7,25c-3.4-2.3-7.5-4-10.9-5.7c-31.9-16.4-64.4-17-64.4-17 s19.8,25.6,51.7,41.7c6.9,3.4,13.2,6.3,19.8,8.6c-4,0.6-8,1.1-12.1,2.3c-30.5,6.4-53.2,23.9-53.2,23.9s27.3,7.5,58.6,1.1 c9.8-2.3,19.8-4.6,27.3-7.5c-1.1,1.1,15.8-8.6,21.6-14.4v60.4h8.6v-61.8c6.3,6.3,22.7,16.4,22.1,14.9c8,2.9,17.5,5.2,27.3,7.5 c30.8,6.3,58.6-1.1,58.6-1.1s-22.1-17.5-53.4-23.8C-169.6,335.7-173.7,335.1-177.7,334.5z" />
        </svg>
    );
}

function disabledIcon() {
    return (
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
            <path transform="translate(351 -153)" fill="var(--status-danger)" d="M-177.7,334.5c6.3-2.3,12.6-5.2,19.8-8.6c31.9-16.4,51.7-41.7,51.7-41.7s-32.5,0.6-64.4,17 c-4,1.7-7.5,4-10.9,5.7c5.7-7.5,12.1-16.4,18.7-25c25-37.1,31.3-77.3,31.3-77.3s-34.8,21-59.2,58.6c-5.2,7.5-9.8,14.9-13.8,22.7 c1.1-10.3,1.1-22.1,1.1-33.6c0-50-19.8-91.1-19.8-91.1s-19.8,40.5-19.8,91.1c0,12.1,0.6,23.3,1.1,33.6c-4-7.5-8.6-14.9-13.8-22.7 c-25-37.1-59.2-58.6-59.2-58.6s6.3,40,31.3,77.3c6.3,9.2,12.1,17.5,18.7,25c-3.4-2.3-7.5-4-10.9-5.7c-31.9-16.4-64.4-17-64.4-17 s19.8,25.6,51.7,41.7c6.9,3.4,13.2,6.3,19.8,8.6c-4,0.6-8,1.1-12.1,2.3c-30.5,6.4-53.2,23.9-53.2,23.9s27.3,7.5,58.6,1.1 c9.8-2.3,19.8-4.6,27.3-7.5c-1.1,1.1,15.8-8.6,21.6-14.4v60.4h8.6v-61.8c6.3,6.3,22.7,16.4,22.1,14.9c8,2.9,17.5,5.2,27.3,7.5 c30.8,6.3,58.6-1.1,58.6-1.1s-22.1-17.5-53.4-23.8C-169.6,335.7-173.7,335.1-177.7,334.5z" />
        </svg>
    );
}

export default definePlugin({
    name: "Ingtoninator",
    description: "Suffixes 'ington' to a random word in your message",
    authors: [EquicordDevs.zyqunix, EquicordDevs.BioTomateDE],
    settings,
    chatBarButton: {
        icon: disabledIcon,
        render: IngtoninatorButton
    },
    start() {
        addMessagePreSendListener(handleMessage);
    },
    stop() {
        removeMessagePreSendListener(handleMessage);
    }
});

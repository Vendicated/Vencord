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

const isLegal = (word: string) => {
    if (word.startsWith("<@")) return false;
    if (word.endsWith("ington")) return false;
    if (/^https?:\/\//i.test(word)) return false;
    if (/[aeouy]$/i.test(word)) return false;
    return true;
};

const handleMessage = ((channelId, message) => {
    if (!settings.store.isEnabled) return;
    if (!message.content || !message.content.trim()) return;

    const words = message.content.trim().split(/\s+/);
    if (words.length === 0) return;

    let index = -1;
    let attempts = 0;
    do {
        index = Math.floor(Math.random() * words.length);
        attempts++;
    } while (!isLegal(words[index]) && attempts < words.length * 2);

    if (isLegal(words[index])) {
        const word = words[index];
        if (word.endsWith("ing")) {
            words[index] = word === word.toUpperCase() ? word + "TON" : word + "ton";
        } else if (word.endsWith("i") || word.endsWith("I")) {
            words[index] = word === word.toUpperCase() ? word + "NGTON" : word + "ngton";
        } else if (word.endsWith("in") || word.endsWith("IN")) {
            words[index] = word === word.toUpperCase() ? word + "GTON" : word + "gton";
        } else if (word.endsWith("ing") || word.endsWith("ING")) {
            words[index] = word === word.toUpperCase() ? word + "TON" : word + "ton";
        } else if (word.endsWith("ingt") || word.endsWith("INGT")) {
            words[index] = word === word.toUpperCase() ? word + "ON" : word + "on";
        } else {
            words[index] = word === word.toUpperCase() ? word + "INGTON" : word + "ington";
        }
    }

    message.content = words.join(" ");
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
    authors: [EquicordDevs.zyqunix],
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

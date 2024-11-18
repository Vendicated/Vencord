/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addPreSendListener, removePreSendListener, SendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, useEffect, useState } from "@webpack/common";

const PHRASES = [
    "UwU",
    "owo",
    "OwO",
    "uwu",
    ">w<",
    "^w^",
    ":3",
    "^_^",
    "x3",
    "rawr~",
    "nya~",
    ">.<",
    "qwq",
    "TwT",
    "*giggles*"
];

function uwufyString(input: string): string {
    const stringLength = input.length;

    // Regular expression to match URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls: { url: string; position: number; }[] = [];
    let match;

    // Store URLs and their positions
    while ((match = urlRegex.exec(input)) !== null) {
        urls.push({ url: match[0], position: match.index });
    }

    // Remove URLs from the input
    const inputWithoutUrls = input.replace(urlRegex, "");

    input = inputWithoutUrls
        .replace(/[rl]/g, "w").replace(/[RL]/g, "W")
        .replace(/ove/g, "uv").replace(/OVE/g, "UV")
        .replace(/o/g, "owo").replace(/O/g, "OwO")
        .replace(/!/g, "!!!").replace(/\?/g, "???");

    if (stringLength % 3 === 0) {
        input = input.toUpperCase();
    }

    input = input.replace(/%(\p{L})/gu, (m, p1) => `%${p1.toLowerCase()}`);
    input = input.replace(/\$(\p{L})/gu, (m, p1) => `$${p1.toLowerCase()}`);

    if (stringLength % 2 === 0) {
        input = input.replace(/([\p{L}])(\b)/gu, "$1$1$1$1$2");
    } else {
        input = input.replace(/\b([\p{L}])(\p{L}*)\b/gu, "$1-$1$2");
    }

    // Only add a phrase if the input without URLs is not empty
    if (inputWithoutUrls.trim().length > 0) {
        input = input + " " + PHRASES[stringLength % PHRASES.length];
    }

    // Reinsert URLs at their original positions with the desired format
    urls.forEach(({ url, position }) => {
        const uwufiedUrl = url.replace(/https?:\/\//, "").replace(/[rl]/g, "w").replace(/[RL]/g, "W");
        const formattedUrl = `[${uwufiedUrl}](${url})`;
        input = input.slice(0, position) + formattedUrl + input.slice(position);
    });

    return input;
}

const settings = definePluginSettings({
    persistState: {
        type: OptionType.BOOLEAN,
        description: "Whether to persist the state of the UwUfy toggle when changing channels",
        default: false,
        onChange(newValue: boolean) {
            if (newValue === false) lastState = false;
        }
    }
});

let lastState = false;

const UwUfyToggle: ChatBarButton = ({ isMainChat }) => {
    const [enabled, setEnabled] = useState(lastState);

    function setEnabledValue(value: boolean) {
        if (settings.store.persistState) lastState = value;
        setEnabled(value);
    }

    useEffect(() => {
        const listener: SendListener = (_, message) => {
            if (enabled) {
                message.content = uwufyString(message.content);
            }
        };

        addPreSendListener(listener);
        return () => void removePreSendListener(listener);
    }, [enabled]);

    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip={enabled ? "Disable UwUfy" : "Enable UwUfy"}
            onClick={() => setEnabledValue(!enabled)}
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                style={{ scale: "1.2" }}
            >
                <text
                    x="50%"
                    y="50%"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fontSize="12"
                    fill="currentColor"
                >
                    UwU
                </text>
                {!enabled && (
                    <>
                        <mask id="vc-uwufy-mask">
                            <path fill="#fff" d="M0 0h24v24H0Z" />
                            <path stroke="#000" strokeWidth="5.99068" d="M0 24 24 0" />
                        </mask>
                        <path fill="var(--status-danger)" d="m21.178 1.70703 1.414 1.414L4.12103 21.593l-1.414-1.415L21.178 1.70703Z" />
                    </>
                )}
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "UwUfy",
    description: "UwUfy your messages",
    authors: [Devs.Leonlp9, Devs.mrsfreckles],
    settings,

    start() {
        addChatBarButton("UwUfyToggle", UwUfyToggle);
    },

    stop() {
        removeChatBarButton("UwUfyToggle");
    }
});

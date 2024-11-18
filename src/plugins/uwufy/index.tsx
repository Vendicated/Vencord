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

const FREAKY_PHRASES = [ // NSFW
    "ngh~",
    "ah~",
    "ahh~",
    "*notice bulge*",
    "*cums cutely*",
    "mhh~",
    "*licks*",
    "*nuzzles*",
    "hmn~",
    "*pounces on you*",
    "*notices your bulge*",
    "*blushes*",
    "gets hard*",
    "#festundflauschig",
];

const EMOJIS = [
    "🤭",
    "🥺",
    "😳",
    "😊",
    "😍",
    "😘",
    "😚",
    "😌",
    "😆",
    "😋",
    "😛",
    "😜",
    "😝",
    "😏",
    "😒",
    "😞",
    "💅"
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

    // Regular expression to match Emojis
    const emojiRegex = /<:[a-zA-Z0-9_]+:[0-9]+>/g;
    const emojis: { emoji: string; position: number; }[] = [];

    // Store Emojis and their positions
    while ((match = emojiRegex.exec(input)) !== null) {
        emojis.push({ emoji: match[0], position: match.index });
    }

    // Remove URLs and Emojis from the input
    const inputWithoutUrlsAndEmojis = input.replace(urlRegex, "").replace(emojiRegex, "");

    input = inputWithoutUrlsAndEmojis
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

    // Only add a phrase if the input without URLs and Emojis is not empty
    if (inputWithoutUrlsAndEmojis.trim().length > 0) {
        if (settings.store.FreakyModeNSFW) {
            const freakyPhrases = settings.store.CustomFreakyPhrases.split(";") || FREAKY_PHRASES;
            input = input + " " + freakyPhrases[stringLength % freakyPhrases.length];
        } else {
            const customPhrases = settings.store.CustomPhrases.split(";") || PHRASES;
            input = input + " " + customPhrases[stringLength % customPhrases.length];
        }
    }

    // Reinsert URLs and Emojis at their original positions with the desired format
    urls.forEach(({ url, position }) => {
        const uwufiedUrl = url.replace(/https?:\/\//, "").replace(/[rl]/g, "w").replace(/[RL]/g, "W");
        const formattedUrl = `[${uwufiedUrl}](${url})`;
        input = input.slice(0, position) + formattedUrl + input.slice(position);
    });

    emojis.forEach(({ emoji, position }) => {
        input = input.slice(0, position) + emoji + input.slice(position);
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
    },
    CustomPhrases: {
        type: OptionType.STRING,
        description: "Custom phrases to add to the UwUfy output (separated by ';')",
        default: PHRASES.join(";"),
        onChange(newValue: string) {
            PHRASES.length = 0;
            PHRASES.push(...newValue.split(";"));
        }
    },
    FreakyModeNSFW: {
        type: OptionType.BOOLEAN,
        description: "Enable freaky mode (NSFW)",
        default: false
    },
    CustomFreakyPhrases: {
        type: OptionType.STRING,
        description: "Custom freaky phrases to add to the UwUfy output (separated by ';')",
        default: FREAKY_PHRASES.join(";"),
        onChange(newValue: string) {
            FREAKY_PHRASES.length = 0;
            FREAKY_PHRASES.push(...newValue.split(";"));
        }
    },
    EnableCustomEmojis: {
        type: OptionType.BOOLEAN,
        description: "Enable custom emojis (not implemented yet)",
        default: false
    },
    CustomEmojis: {
        type: OptionType.STRING,
        description: "Custom emojis to add to the UwUfy output (separated by ';')",
        default: EMOJIS.join(";"),
        onChange(newValue: string) {
            EMOJIS.length = 0;
            EMOJIS.push(...newValue.split(";"));
        }
    }
});

let lastState = false;

const UwUfyToggle: ChatBarButton = ({ isMainChat }) => {
    const [enabled, setEnabled] = useState(lastState);
    const [enabledNSFW, setEnabledNSFW] = useState(settings.store.FreakyModeNSFW);

    function setEnabledValue(value: boolean) {
        if (settings.store.persistState) lastState = value;
        setEnabled(value);
    }

    function setNSFWValue(value: boolean) {
        if (settings.store.persistState) lastState = value;
        settings.store.FreakyModeNSFW = value;
        setEnabledNSFW(value);
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
            tooltip={enabled ? "Disable " + (enabledNSFW ? "XwXfy" : "UwUfy") : "Enable " + (enabledNSFW ? "XwXfy" : "UwUfy")}
            onClick={() => setEnabledValue(!enabled)}
            onContextMenu={e => {
                e.preventDefault();
                setNSFWValue(!enabledNSFW);
            }}
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
                    fill={enabledNSFW ? "var(--status-danger)" : "currentColor"}
                >
                    {enabledNSFW ? "XwX" : "UwU"}
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
    authors: [Devs.Leonlp9, Devs.mrsfreckles, Devs.fiotux, Devs.ena_m_v, Devs.enmuowo],
    settings,

    start() {
        addChatBarButton("UwUfyToggle", UwUfyToggle);
    },

    stop() {
        removeChatBarButton("UwUfyToggle");
    }
});

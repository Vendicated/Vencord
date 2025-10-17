/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    receivedInput: {
        type: OptionType.STRING,
        description: "Language that received messages should be translated from",
        default: "auto",
        hidden: true
    },
    receivedOutput: {
        type: OptionType.STRING,
        description: "Language that received messages should be translated to",
        default: "en",
        hidden: true
    },
    sentInput: {
        type: OptionType.STRING,
        description: "Language that your own messages should be translated from",
        default: "auto",
        hidden: true
    },
    sentOutput: {
        type: OptionType.STRING,
        description: "Language that your own messages should be translated to",
        default: "en",
        hidden: true
    },

    showChatBarButton: {
        type: OptionType.BOOLEAN,
        description: "Show translate button in chat bar",
        default: true
    },
    service: {
        type: OptionType.SELECT,
        description: IS_WEB ? "Translation service (Not supported on Web!)" : "Translation service",
        disabled: () => IS_WEB,
        options: [
            { label: "Google Translate", value: "google", default: true },
            { label: "DeepL Free", value: "deepl" },
            { label: "DeepL Pro", value: "deepl-pro" },
            { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
            { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
            { label: "Gemini 2.5 Flash Lite", value: "gemini-2.5-flash-lite" }, // the fastest model
            { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" }
        ] as const,
        onChange: resetLanguageDefaults
    },
    deeplApiKey: {
        type: OptionType.STRING,
        description: "DeepL API key",
        default: "",
        placeholder: "Get your API key from https://deepl.com/your-account",
        disabled: () => IS_WEB
    },
    geminiApiKey: {
        type: OptionType.STRING,
        description: "Gemini API key",
        default: "",
        placeholder: "Get your API key from Google AI Studio",
        disabled: () => IS_WEB
    },
    geminiStyle: {
        type: OptionType.SELECT,
        description: "Style for Gemini translations",
        disabled: () => IS_WEB || !settings.store.service.startsWith("gemini"),
        options: [
            { label: "Normal", value: "normal", default: true },
            { label: "Professional", value: "professional" },
            { label: "Formal", value: "formal" },
            { label: "Informal", value: "informal" },
            { label: "Long", value: "long" },
            { label: "Short", value: "short" },
            { label: "Native", value: "native" }
        ] as const
    },
    geminiOptimizeForSpeed: {
        type: OptionType.BOOLEAN,
        description: "Optimize for speed (may reduce translation quality)",
        default: false,
        disabled: () => IS_WEB || !settings.store.service.startsWith("gemini")
    },
    geminiExplain: {
        type: OptionType.BOOLEAN,
        description: "When using Gemini, also provide a brief, speculated explanation of the message's context or meaning.",
        default: false,
        disabled: () => IS_WEB || !settings.store.service.startsWith("gemini")
    },
    autoTranslate: {
        type: OptionType.BOOLEAN,
        description: "Automatically translate your messages before sending. You can also shift/right click the translate button to toggle this",
        default: false
    },
    showAutoTranslateTooltip: {
        type: OptionType.BOOLEAN,
        description: "Show a tooltip on the ChatBar button whenever a message is automatically translated",
        default: true
    },
}).withPrivateSettings<{
    showAutoTranslateAlert: boolean;
}>();

export function resetLanguageDefaults() {
    if (IS_WEB || settings.store.service === "google" || settings.store.service.startsWith("gemini")) {
        settings.store.receivedInput = "auto";
        settings.store.receivedOutput = "en";
        settings.store.sentInput = "auto";
        settings.store.sentOutput = "en";
    } else {
        settings.store.receivedInput = "";
        settings.store.receivedOutput = "en-us";
        settings.store.sentInput = "";
        settings.store.sentOutput = "en-us";
    }
}

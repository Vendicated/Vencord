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
        description: "Input language for received messages",
        default: "auto",
        hidden: true
    },
    receivedOutput: {
        type: OptionType.STRING,
        description: "Output language for received messages",
        default: "en",
        hidden: true
    },
    sentInput: {
        type: OptionType.STRING,
        description: "Input language for sent messages",
        default: "auto",
        hidden: true
    },
    sentOutput: {
        type: OptionType.STRING,
        description: "Output language for sent messages",
        default: "en",
        hidden: true
    },
    autoTranslate: {
        type: OptionType.BOOLEAN,
        description: "Automatically translate your messages before sending. You can also shift/right click the translate button to toggle this",
        default: false
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
            { label: "DeepL Pro", value: "deepl-pro" }
        ] as const,
        onChange: () => {
            if (settings.store.service === "google") {
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
    },
    deeplApiKey: {
        type: OptionType.STRING,
        description: "DeepL API key",
        default: "",
        placeholder: "Get your API key from https://deepl.com/your-account",
        disabled: () => settings.store.service === "google"
    }
}).withPrivateSettings<{
    showAutoTranslateAlert: boolean;
}>();

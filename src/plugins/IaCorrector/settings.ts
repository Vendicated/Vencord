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

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { ApiKeyHelpButton } from "./ApiKeyHelpButton";

export const settings = definePluginSettings({
    apiKey: {
        type: OptionType.STRING,
        description: "Mistral API key",
        default: "",
        placeholder: "Get your API key from https://console.mistral.ai/"
    },
    apiKeyHelp: {
        type: OptionType.COMPONENT,
        component: ApiKeyHelpButton
    },
    autoCorrect: {
        type: OptionType.BOOLEAN,
        description: "Automatically correct messages before sending",
        default: false
    },
    showSuccessToast: {
        type: OptionType.BOOLEAN,
        description: "Show a success toast after correcting",
        default: true
    },
    targetLanguage: {
        type: OptionType.STRING,
        description: "Target language (\"auto\" or ISO code like en, fr, es)",
        default: "auto",
        placeholder: "auto"
    }
});

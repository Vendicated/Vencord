/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    service: {
        type: OptionType.SELECT,
        description: "Choose the text correction service",
        options: [
            { label: "OpenAI", value: "openai" },
            { label: "LanguageTool", value: "languagetool" },
        ],
        default: "openai",
    },
    apiKey: {
        type: OptionType.STRING,
        description: "Your API key for the selected service.",
        placeholder: "Enter API Key",
        default: "",
    },
    autoCorrect: {
        type: OptionType.BOOLEAN,
        description: "Enable automatic text correction.",
        default: false,
    },
});

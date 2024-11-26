/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    ollamaHost: {
        type: OptionType.STRING,
        description: "Ollama host URL",
        default: "http://localhost:11434"
    },
    ollamaModel: {
        type: OptionType.SELECT,
        description: "Ollama model to use (ollama.com/library)",
        options: [
            { label: "🌬️ mistral (ollama run mistral)", value: "mistral", default: true },
            { label: "🦙 llama3.1 (ollama run llama3.1)", value: "llama3.1" },
            { label: "🦙 llama3.2 (ollama run llama3.2)", value: "llama3.2" },
            { label: "💎 gemma2 (ollama run gemma2)", value: "gemma2" },
            { label: "🧠 qwen (ollama run qwen)", value: "qwen" },
            { label: "🔢 phi3 (ollama run phi3)", value: "phi3" },
        ]
    },
    maxTokens: {
        type: OptionType.SLIDER,
        description: "Maximum number of tokens in the summary",
        markers: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
        default: 100,
        stickToMarkers: false
    },
    temperature: {
        type: OptionType.SLIDER,
        description: "Temperature for text generation",
        markers: [0, 0.25, 0.5, 0.75, 1],
        default: 0.3,
        stickToMarkers: false
    }
});

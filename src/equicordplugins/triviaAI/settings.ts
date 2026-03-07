/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    apiKey: {
        type: OptionType.STRING,
        description: "API Key.",
        default: "",
        placeholder: "Enter API Key here for your AI endpoint.",
        componentProps: {
            type: "password"
        }
    },
    model: {
        type: OptionType.STRING,
        description: "AI Model to use.",
        default: "google/gemini-3-flash-preview",
        placeholder: "e.g. google/gemini-3-flash-preview, inception/mercury, openai/gpt-5.2-chat, etc."
    },
    systemPrompt: {
        type: OptionType.STRING,
        description: "System Prompt for the AI.",
        default: "You are a helpful assistant who answers questions for the user in a concise and short way while using the least amount of words and punctuation.",
        placeholder: "Enter system prompt."
    },
    maxTokens: {
        type: OptionType.NUMBER,
        description: "Maximum number of tokens in the response.",
        default: 500
    },
    endpoint: {
        type: OptionType.STRING,
        description: "OpenAI Compatible AI Endpoint.",
        default: "https://openrouter.ai/api/v1/chat/completions",
        placeholder: "Enter your OpenAI compatible AI endpoint here."
    },
    autoRespond: {
        type: OptionType.BOOLEAN,
        description: "Automatically respond to messages on receiving a response.",
        default: false
    },
    supportImages: {
        type: OptionType.BOOLEAN,
        description: "Pass images to the AI for context (if any). This is not supported by all models.",
        default: true
    }
});

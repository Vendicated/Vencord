/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { Ollama } from "./ollama";

const settings = definePluginSettings({
    host: {
        type: OptionType.STRING,
        description: "Ollama's host address",
        default: "http://127.0.0.1:11434"
    },
    model: {
        type: OptionType.STRING,
        description: "The Ollama model to use",
        default: "mistral"
    }
});

const apiClient = new Ollama();

export default definePlugin({
    name: "PersonalAssistant",
    description: "TBD",
    authors: [Devs.Arjix],
    settings,

    async start() {
        console.log("!Ollama!", await this.apiClient.list());
    },

    commands: [{
        name: "generate",
        description: "Generates text using Ollama",
        options: [{
            name: "Prompt",
            description: "The prompt to pass to Ollama",
            required: true,
            type: ApplicationCommandOptionType.STRING
        }],
        execute: async (args, ctx) => {
            const { model } = settings.store;
            const prompt = findOption<string>(args, "Prompt");
            if (!prompt) return sendBotMessage(ctx.channel.id, {
                content: "A prompt is required."
            });

            const response = await apiClient.chat({
                model,
                messages: [
                    {
                        role: "system",
                        content: "You will generate text based on the user's prompt."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                stream: false
            });

            const message = "message" in response && "content" in response.message && response.message.content;
            if (typeof message !== "string") return;

            return {
                content: message.replace(/\n\n/g, "\n")
            };
        },
    }]
});

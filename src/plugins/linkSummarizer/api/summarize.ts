/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PluginNative } from "@utils/types";

import { settings } from "../settings";

const Native = VencordNative.pluginHelpers.LinkSummarizer as PluginNative<typeof import("../native")>;

export async function summarizeUrl(url: string) {
    try {
        const html = await Native.fetchUrlContent(url).catch(err => {
            console.error("[LinkSummarizer] Error fetching content:", err);
            return null;
        });

        if (!html) return null;

        const payload = JSON.stringify({
            model: settings.store.ollamaModel,
            prompt: `Please provide a brief summary of the following text in 2-3 sentences: ${html}`,
            max_tokens: settings.store.maxTokens,
            temperature: settings.store.temperature,
            stream: false
        });

        const summary = await Native.callOllamaApi(settings.store.ollamaHost, payload).catch(err => {
            console.error("[LinkSummarizer] Error from Ollama API:", err);
            return null;
        });

        if (!summary) return null;

        return summary;
    } catch (error) {
        console.error("[LinkSummarizer] Unexpected error:", error);
        return null;
    }
}

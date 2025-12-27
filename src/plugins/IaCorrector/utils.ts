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

import { Logger } from "@utils/Logger";
import { PluginNative } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

const Native = VencordNative.pluginHelpers.IaCorrector as PluginNative<typeof import("./native")>;

export const logger = new Logger("IaCorrector");

export interface IaResult {
    text: string;
}

export function showError(message: string) {
    showToast(message, Toasts.Type.FAILURE);
}

export function showSuccess(message: string) {
    showToast(message, Toasts.Type.SUCCESS);
}

export function assertApiKey(apiKey: string) {
    if (!apiKey.trim()) {
        showError("Mistral API key is missing in the plugin settings.");
        return false;
    }

    return true;
}

function normalizeTargetLanguage(targetLanguage: string) {
    const normalized = (targetLanguage || "auto").trim().toLowerCase();
    if (normalized === "auto") return "auto";
    if (/^[a-z]{2}(-[a-z]{2})?$/.test(normalized)) return normalized;
    return "auto";
}

export async function callMistral(text: string, targetLanguage: string, apiKey: string): Promise<IaResult> {
    const target = normalizeTargetLanguage(targetLanguage);
    const targetInstr = target === "auto"
        ? "Detect the language of the text and reply in that same language."
        : `Reply in ${target} only.`;

    const systemPrompt = `You are a spelling and grammar corrector. Correct only the provided text and reply with only the corrected text, without explanations. ${targetInstr}`;

    logger.debug("Calling Mistral", { hasApiKey: Boolean(apiKey), textPreview: text.slice(0, 80) });

    const payload = JSON.stringify({
        model: "mistral-small",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
        ]
    });

    const { status, data } = await Native.makeMistralRequest(apiKey, payload);

    switch (status) {
        case 200:
            break;
        case -1:
            throw new Error(`Failed to connect to Mistral API: ${data}`);
        case 401:
            throw new Error("Invalid Mistral API key.");
        default:
            throw new Error(`Mistral API error (${status}): ${data}`);
    }

    let json: any;
    try {
        json = JSON.parse(data);
    } catch (err) {
        logger.error("Failed to parse Mistral response", err);
        throw new Error("Invalid Mistral response.");
    }

    const content: string | undefined = json?.choices?.[0]?.message?.content;
    if (!content) {
        logger.error("Mistral returned an empty response", json);
        throw new Error("Invalid Mistral response.");
    }

    const cleaned = content.trim();
    logger.debug("Mistral response OK", { length: cleaned.length, preview: cleaned.slice(0, 80) });
    return { text: cleaned };
}

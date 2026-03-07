/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { insertTextIntoChatInputBox, sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Message } from "@vencord/discord-types";
import { showToast, Toasts } from "@webpack/common";

import { settings } from "./settings";

const logger = new Logger("TriviaAI");

type TextPart = {
    type: "text";
    text: string;
};

type ImagePart = {
    type: "image_url";
    image_url: {
        url: string;
        detail?: "auto" | "high" | "low";
    };
};

export type ContentPayload = string | (TextPart | ImagePart)[];

export function parseMessageContent(message: Message): ContentPayload | null {
    const textParts: string[] = [];

    if (message.content && message.content.trim().length > 0) {
        textParts.push(message.content);
    }

    message.embeds.forEach(embed => {
        const embedBuffer: string[] = [];

        const parts = [
            embed.provider?.name ? `> ${embed.provider.name}` : null,
            embed.author?.name ? `**${embed.author.name}**` : null,
            embed.rawTitle ? `## ${embed.rawTitle}` : null,
            embed.rawDescription ?? null,
            ...(embed.fields?.map(f => (f.rawName && f.rawValue) ? `**${f.rawName}**: ${f.rawValue}` : null) ?? []),
            embed.footer?.text ? `_${embed.footer.text}_` : null,
        ];

        parts.forEach(p => {
            if (p) embedBuffer.push(p);
        });

        if (embedBuffer.length > 0) textParts.push(embedBuffer.join("\n"));
    });

    const combinedText = textParts.join("\n\n");

    if (!settings.store.supportImages) {
        return combinedText || null;
    }

    const imageUrls = new Set<string>();

    message.attachments
        .filter(att => att.content_type?.startsWith("image/"))
        .forEach(att => imageUrls.add(att.url));

    message.embeds.forEach(embed => {
        const potentialUrls = [
            embed.image?.url,
            embed.thumbnail?.url,
            ...(embed.images?.map(img => img.url) ?? [])
        ];

        potentialUrls.forEach(url => {
            if (url) imageUrls.add(url);
        });
    });

    if (imageUrls.size === 0) {
        return combinedText || null;
    }

    const payload: (TextPart | ImagePart)[] = [];

    if (combinedText.length > 0) {
        payload.push({
            type: "text",
            text: combinedText
        });
    }

    imageUrls.forEach(url => {
        payload.push({
            type: "image_url",
            image_url: { url }
        });
    });

    return payload;
}

export async function handleResponse(message: Message, response: string): Promise<string> {
    if (settings.store.autoRespond) {
        sendMessage(
            message.channel_id,
            { content: response },
            true,
            { messageReference: { channel_id: message.channel_id, message_id: message.id } }
        );
        return response;
    } else {
        insertTextIntoChatInputBox(response);
        return response;
    }
}

export async function getResponse(payload: ContentPayload): Promise<string> {
    if (!settings.store.apiKey) {
        showToast("TriviaAI: API Key is not set.", Toasts.Type.FAILURE);
        return "";
    }

    if (!settings.store.endpoint) {
        showToast("TriviaAI: Endpoint is not set.", Toasts.Type.FAILURE);
        return "";
    }

    if (!settings.store.model) {
        showToast("TriviaAI: Model is not set.", Toasts.Type.FAILURE);
        return "";
    }

    try {
        const req = await fetch(settings.store.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${settings.store.apiKey}`
            },
            body: JSON.stringify({
                model: settings.store.model,
                messages: [
                    {
                        role: "system",
                        content: settings.store.systemPrompt
                    },
                    {
                        role: "user",
                        content: payload
                    }
                ],
                max_tokens: settings.store.maxTokens,
            })
        });

        if (!req.ok) {
            const errorBody = await req.text();
            const errorMessage = `API request failed with status ${req.status}: ${errorBody}`;
            logger.error(errorMessage);
            showToast(errorMessage, Toasts.Type.FAILURE);
            return "";
        }

        const data = await req.json();

        if (data.error) {
            const errorMessage = data.error.message ?? "An unknown error occurred";
            logger.error(`API Error: ${errorMessage}`);
            showToast(errorMessage, Toasts.Type.FAILURE);
            return "";
        }

        const response = data.choices[0].message.content;

        if (!response?.trim()) {
            logger.warn("no response from AI model");
            return "";
        }

        return response;
    } catch (e) {
        logger.error("Error getting response from AI model", e);
        showToast("Error getting response from AI model", Toasts.Type.FAILURE);
        return "";
    }
}

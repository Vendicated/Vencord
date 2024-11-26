/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

export async function fetchUrlContent(_: IpcMainInvokeEvent, url: string): Promise<string> {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const cleanedContent = cleanHtml(html);

        return cleanedContent;
    } catch (error) {
        console.error("[LinkSummarizer:Native] Error fetching URL:", error);
        throw error;
    }
}

export async function callOllamaApi(_: IpcMainInvokeEvent, host: string, payload: string): Promise<string> {
    try {
        const response = await fetch(`${host}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: payload
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rawResponse = await response.text();

        try {
            const data = JSON.parse(rawResponse);
            if (!data.response) {
                throw new Error("No response field in Ollama data");
            }
            return data.response;
        } catch (e) {
            console.error("[LinkSummarizer:Native] Error parsing Ollama response:", e);
            throw e;
        }
    } catch (error) {
        console.error("[LinkSummarizer:Native] Error in Ollama API call:", error);
        throw error;
    }
}

function cleanHtml(html: string): string {
    const ELEMENTS_TO_REMOVE = [
        "script", "style", "iframe", "header", "footer", "nav",
        "noscript", "svg", "figure", "video", "form", "input",
        "button", "aside"
    ];

    try {
        ELEMENTS_TO_REMOVE.forEach(tag => {
            const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, "gis");
            html = html.replace(regex, " ");
        });

        html = html.replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        return html;
    } catch (error) {
        console.error("[LinkSummarizer:Native] Error cleaning HTML:", error);
        throw error;
    }
}

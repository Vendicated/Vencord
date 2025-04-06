/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UserStore } from "@webpack/common";

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise<Blob>(resolve => {
        canvas.toBlob(blob => {
            if (blob) {
                resolve(blob);
            } else {
                throw new Error("Failed to create Blob");
            }
        }, "image/png");
    });
}

export function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, preparingSentence: string[], lines: string[]) {
    const words = text.split(" ");

    for (let i = 0; i < words.length; i++) {
        const workSentence = preparingSentence.join(" ") + " " + words[i];

        if (context.measureText(workSentence).width > maxWidth) {
            lines.push(preparingSentence.join(" "));
            preparingSentence = [words[i]];
        } else {
            preparingSentence.push(words[i]);
        }
    }

    lines.push(preparingSentence.join(" "));

    lines.forEach(element => {
        const lineWidth = context.measureText(element).width;
        const xOffset = (maxWidth - lineWidth) / 2;

        y += lineHeight;
        context.fillText(element, x + xOffset, y);
    });
}

export async function fetchImageAsBlob(url: string): Promise<Blob> {
    try {
        if (!url) throw new Error("Invalid URL: URL is empty or undefined");

        const response = await fetch(url, {
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Accept": "image/*"
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error("Error fetching image:", error);
        return new Blob([
            new Uint8Array([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
                0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
                0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
                0x42, 0x60, 0x82
            ])
        ], { type: "image/png" });
    }
}

export function FixUpQuote(quote) {
    const emojiRegex = /<a?:(\w+):(\d+)>/g;
    quote = quote.replace(emojiRegex, "");

    const mentionRegex = /<@(.*)>/;
    let result = quote;

    try {
        const matches = mentionRegex.exec(quote);
        if (matches) {
            matches.forEach(match => {
                try {
                    const userId = match.replace("<@", "").replace(">", "");
                    const user = UserStore.getUser(userId);
                    if (user && user.username) {
                        result = result.replace(match, `@${user.username}`);
                    }
                } catch (err) {
                    console.error("Error processing mention:", err);
                }
            });
        }
    } catch (err) {
        console.error("Error in FixUpQuote:", err);
    }

    return result;
}

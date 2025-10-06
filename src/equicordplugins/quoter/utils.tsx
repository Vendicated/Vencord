/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UserStore } from "@webpack/common";

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
            blob ? resolve(blob) : reject(new Error("Failed to create Blob"));
        }, "image/png");
    });
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, preparingSentence: string[], lines: string[]) {
    text.split(" ").forEach(word => {
        const workSentence = preparingSentence.join(" ") + " " + word;
        if (ctx.measureText(workSentence).width > maxWidth) {
            lines.push(preparingSentence.join(" "));
            preparingSentence = [word];
        } else {
            preparingSentence.push(word);
        }
    });

    lines.push(preparingSentence.join(" "));

    lines.forEach(line => {
        const xOffset = (maxWidth - ctx.measureText(line).width) / 2;
        y += lineHeight;
        ctx.fillText(line, x + xOffset, y);
    });
}

export async function fetchImageAsBlob(url: string): Promise<Blob> {
    if (!url) throw new Error("Invalid URL: URL is empty or undefined");
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        return await response.blob();
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

export function FixUpQuote(quote: string) {
    try {
        quote = quote.replace(/<a?:(\w+):(\d+)>/g, "");
        const mentionMatch = /<@(.*?)>/.exec(quote);
        if (mentionMatch) {
            mentionMatch.forEach(match => {
                try {
                    const user = UserStore.getUser(match.replace(/[<@>]/g, ""));
                    if (user?.username) quote = quote.replace(match, `@${user.username}`);
                } catch { }
            });
        }
    } catch { }
    return quote;
}

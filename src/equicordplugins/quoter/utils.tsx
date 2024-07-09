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
    const response = await fetch(url);
    const blob = await response.blob();
    return blob;
}

export function FixUpQuote(quote) {
    const emojiRegex = /<a?:(\w+):(\d+)>/g;
    quote = quote.replace(emojiRegex, "");


    const mentionRegex = /<@(.*)>/;
    let result = quote;

    mentionRegex.exec(quote)?.forEach(match => {
        console.log(match);
        result = result.replace(match, `@${UserStore.getUser(match.replace("<@", "").replace(">", "")).username}`);
    });

    return result;
}

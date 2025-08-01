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

import { MessageObject } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import definePlugin from "@utils/types";

const MAX_CHARS = 2000;

export default definePlugin({
    name: "Split Large Messages",
    description: "Send multiple messages automatically if a message is too long",
    authors: [Devs.celgost],

    patches: [
        // Constants representing the maximum length of a message for a non-premium and premium user (2000 and 4000)
        {
            find: "J6R:()=>eG,JjL:()=>g.Jj",
            replacement: [
                {
                    match: /J6R:\(\)=>eG/,
                    replace: "J6R:()=>999999"
                }
            ]
        },
        {
            find: "en1:()=>eB,epS:()=>rc",
            replacement: [
                {
                    match: /en1:\(\)=>eB/,
                    replace: "en1:()=>999999"
                }
            ]
        }
    ],

    onBeforeMessageSend(channelId, message) {
        if (message.content.length > MAX_CHARS) {
            const messageChunks = splitMessageSafe(message.content);

            setTimeout(() => {
                messageChunks.forEach(messageChunk => sendMessage(channelId, createMessageObject(messageChunk)));
            }, 20);
            message.content = "";
        }
    }
});

function createMessageObject(content: string): MessageObject {
    return {
        content,
        validNonShortcutEmojis: [],
        invalidEmojis: [],
        tts: false,
    };
}

function splitMessageSafe(text: string, limit = MAX_CHARS): string[] {
    if (text.length <= limit) return [text];

    const chunks = splitBySentences(text, limit);
    return chunks.flatMap(chunk => splitLongWords(chunk, limit));
}

function splitBySentences(text: string, limit: number): string[] {
    // Split by sentences while preserving newlines
    const sentences = text.match(/[^.!?]*[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
        if (!sentence.trim()) continue;

        const testChunk = currentChunk ? currentChunk + sentence : sentence;

        if (testChunk.length > limit && currentChunk.length > 0) {
            // Check if current chunk ends with double newline
            const endsWithDoubleNewline = /\n\s*\n\s*$/.test(currentChunk);

            chunks.push(currentChunk);

            // If previous chunk ended with double newline, start next with "_ _\n" to emulate a newline
            if (endsWithDoubleNewline) {
                currentChunk = "_ _\n" + sentence.trimStart();
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk = testChunk;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk);
    }

    return chunks.length > 0 ? chunks : splitByWords(text, limit);
}

// Fallback function in case sentence splitting fails
function splitByWords(text: string, limit: number): string[] {
    const words = text.split(" ");
    const chunks: string[] = [];
    let currentChunk = "";

    for (const word of words) {
        const testChunk = (currentChunk + " " + word).trim();
        if (testChunk.length > limit && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = word;
        } else {
            currentChunk = testChunk;
        }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

// In case there are exceedingly long words, split them into chunks
function splitLongWords(chunk: string, limit: number): string[] {
    if (chunk.length <= limit) return [chunk];

    const numChunks = Math.ceil(chunk.length / limit);
    return Array.from({ length: numChunks }, (_, i) =>
        chunk.slice(i * limit, (i + 1) * limit)
    );
}

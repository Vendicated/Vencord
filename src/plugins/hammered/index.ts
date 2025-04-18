/*
 * Tallycord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";

import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import definePlugin, { OptionType } from "@utils/types";

import { UwuChatBarIcon } from "./hammeredicon";
import { Devs } from "@utils/constants";
// import { random } from "./hammerer";

export const settings = definePluginSettings({
    // spaceChance: {
    //     type: OptionType.SLIDER,
    //     markers: makeRange(0, 1, 0.1),
    //     default: 0.1,
    //     description: "Chance to insert spaces into words",
    // },
    // replaceChance: {
    //     type: OptionType.SLIDER,
    //     markers: makeRange(0, 1, 0.1),
    //     default: 0.4,
    //     description: "chance for nearby key replacements",
    // },
    autoHammer: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "jfkasdflafhuel"
    }
});
export default definePlugin({
    name: "Hammered",
    description: "makes you sound drunk af!",
    authors: [Devs.tally],
    dependencies: ["MessageAccessoriesAPI", "MessagePopoverAPI", "MessageEventsAPI", "ChatInputButtonAPI"],
    settings,


    start() {


        addChatBarButton("vc-hammer", UwuChatBarIcon);


        this.preSend = addMessagePreSendListener(async (_, message) => {
            if (!message.content || !settings.store.autoHammer) return;

            message.content = butcherText(message.content);
        });
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
        removeChatBarButton("vc-hammer");
    },
});

// Helper: re‑apply a capitalization pattern from the original word.
function applyCapsPattern(original: string, transformed: string): string {
    // Remove non-alphabetic characters for pattern checking.
    const alphabets = original.replace(/[^a-zA-Z]/g, "");
    // If the word is entirely uppercase, return the transformed version in uppercase.
    if (alphabets && alphabets === alphabets.toUpperCase()) {
        return transformed.toUpperCase();
    }
    // If only the first letter is uppercase (and the rest are lowercase), force that.
    if (
        original.length > 0 &&
        original[0] === original[0].toUpperCase() &&
        original.slice(1) === original.slice(1).toLowerCase()
    ) {
        return transformed.charAt(0).toUpperCase() + transformed.slice(1).toLowerCase();
    }
    // Otherwise, leave it as is.
    return transformed;
}

// Updated QWERTY layout including number row and common symbols.
function getRandomNearbyLetter(letter: string): string {
    const lowerLetter = letter.toLowerCase();
    const qwertyRows = [
        "`1234567890-=",
        "qwertyuiop[]\\",
        "asdfghjkl;'",
        "zxcvbnm,./"
    ];

    let rowIndex = -1, colIndex = -1;
    for (let i = 0; i < qwertyRows.length; i++) {
        const col = qwertyRows[i].indexOf(lowerLetter);
        if (col !== -1) {
            rowIndex = i;
            colIndex = col;
            break;
        }
    }
    if (rowIndex === -1) return letter;

    const offsets: [number, number][] = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    const neighbors = offsets.map(([dx, dy]) => {
        const newRow = rowIndex + dx;
        const newCol = colIndex + dy;
        if (newRow >= 0 && newRow < qwertyRows.length && newCol >= 0 && newCol < qwertyRows[newRow].length) {
            return qwertyRows[newRow][newCol];
        }
        return null;
    }).filter(n => n !== null) as string[];

    if (neighbors.length === 0) return letter;
    const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
    // Preserve case for alphabetic characters.
    return letter === letter.toUpperCase() ? neighbor.toUpperCase() : neighbor;
}

// Transform a segment (typically a word) by repeatedly applying random operations.
function transformSegment(segment: string): string {
    let result = segment;
    const maxIterations = 3; // Maximum additional transformations.
    let iterations = 0;
    // Chance to re-run transformations on the same segment.
    while (Math.random() < 0.5 && iterations < maxIterations) {
        const op = Math.random();
        if (op < 0.33) {
            // Swap two adjacent alphabetical characters if possible.
            if (result.length >= 2) {
                const indices: number[] = [];
                for (let i = 0; i < result.length - 1; i++) {
                    if (/[a-zA-Z]/.test(result[i]) && /[a-zA-Z]/.test(result[i + 1])) {
                        indices.push(i);
                    }
                }
                if (indices.length > 0) {
                    const idx = indices[Math.floor(Math.random() * indices.length)];
                    const arr = result.split("");
                    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                    result = arr.join("");
                }
            }
        } else if (op < 0.66) {
            // Duplicate a random alphabetical character.
            const indices: number[] = [];
            for (let i = 0; i < result.length; i++) {
                if (/[a-zA-Z]/.test(result[i])) indices.push(i);
            }
            if (indices.length > 0) {
                const idx = indices[Math.floor(Math.random() * indices.length)];
                result = result.slice(0, idx + 1) + result[idx] + result.slice(idx + 1);
            }
        } else {
            // Replace a random alphabetical character with a nearby key.
            const indices: number[] = [];
            for (let i = 0; i < result.length; i++) {
                if (/[a-zA-Z]/.test(result[i])) indices.push(i);
            }
            if (indices.length > 0) {
                const idx = indices[Math.floor(Math.random() * indices.length)];
                result = result.slice(0, idx) + getRandomNearbyLetter(result[idx]) + result.slice(idx + 1);
            }
        }
        iterations++;
    }
    return result;
}

// Main function: splits the text, transforms each word, and re‑applies the original caps pattern.
function butcherText(input: string): string {
    return input
        .split(" ")
        .map(word => {
            const transformed = transformSegment(word);
            return applyCapsPattern(word, transformed);
        })
        .join(" ");
}

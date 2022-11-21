/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { findOption, RequiredMessageOption } from "../api/Commands";
import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

const chars: [number, string][] = [
    [200, "🫂"],
    [50, "💖"],
    [10, "✨"],
    [5, "🥺"],
    [1, ","],
    [0, "❤️"],
];

const byte_seperator = "👉👈";

const terminator = new RegExp(`(${byte_seperator})?$`);


interface EncoderType {
    encode: (input?: string) => Uint8Array;
}

interface DecoderType {
    decode: (input?: Uint8Array) => string;
}

function textDecoder(): DecoderType {
    return new TextDecoder();
}

function textEncoder(): EncoderType {
    return new TextEncoder();
}

function encodeChar(charmessage: number): string {
    if (charmessage === 0) return "";
    const [val, currentCase]: [number, string] =
      chars.find(([val]) => charmessage >= val) || chars[-1];
    return `${currentCase}${encodeChar(charmessage - val)}`;
}

export function decode(message: string): string {
    return textDecoder().decode(Uint8Array.from(
        message
            .trim()
            .replace(terminator, "")
            .split(byte_seperator)
            .map(letters => {
                return Array.from(letters)
                    .map(character => {
                        const [message, emoji]: [number, string] =
                chars.find(([_, em]) => em === character) ||
                 chars[-1];
                        if (!emoji) {
                            throw new TypeError(`invalid text: '${message}'`);
                        }
                        return message;
                    })
                    .reduce((p, c) => p + c);
            })
    ));
}

export function encode(message: string): string {
    return Array.from(textEncoder().encode(message))
        .map((v: number) => encodeChar(v) + byte_seperator)
        .join("");
}


export default definePlugin({
    name: "bottomify",
    description: "🥺👉👈 is for me?",
    authors: [Devs.bandit],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "bottomify",
            description: "🥺",
            options: [RequiredMessageOption],

            execute: opts => ({
                content: encode(findOption(opts, "message", "")),
            }),
        },
        {   name: "debottomify",
            description: "👉👈",
            options: [RequiredMessageOption],

            execute: opts => ({
                content: decode(findOption(opts, "message", "")),
            }),
        }
    ]
});

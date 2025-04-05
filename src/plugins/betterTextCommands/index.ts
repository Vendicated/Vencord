/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated, Tiso and contributors
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

import {
    ApplicationCommandInputType,
    findOption,
    sendBotMessage,
    OptionalMessageOption,
    RequiredMessageOption
} from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

/** Converts text to alternating case like "HeLlO wOrLd" */
function toMockCase(input: string): string {
    return input
        .split("")
        .map((char, idx) => idx % 2 ? char.toUpperCase() : char.toLowerCase())
        .join("");
}

/** Reverses the input text */
function reverseText(input: string): string {
    return input.split("").reverse().join("");
}

/** Makes the input text spooky */
function spookyText(input: string): string {
    const spookyMap: Record<string, string> = {
        A: "ᗩ", B: "ᗷ", C: "ᑕ", D: "ᗪ", E: "E", F: "ᖴ", G: "G",
        H: "ᕼ", I: "I", J: "ᒍ", K: "K", L: "ᒪ", M: "ᗰ", N: "ᑎ",
        O: "O", P: "ᑭ", Q: "ᑫ", R: "ᖇ", S: "ᔕ", T: "T", U: "ᑌ",
        V: "ᐯ", W: "ᗯ", X: "᙭", Y: "Y", Z: "ᘔ"
    };
    return input.toUpperCase().split("").map(c => spookyMap[c] || c).join("");
}

/** UwUify the text, making it cuter */
function uwuifyText(input: string): string {
    return input
        .replace(/r/g, "w")
        .replace(/l/g, "w")
        .replace(/L/g, "W")
        .replace(/R/g, "W")
        .replace(/n([aeiou])/g, "ny$1")
        .replace(/N([aeiou])/g, "Ny$1")
        .replace(/ove/g, "uv")
        .replace(/!+/g, "!!1!")
        .replace(/([^\w\s])\1+/g, "$1");
}

/** Generates a sarcastic version of the text */
function sarcasticText(input: string): string {
    return input
        .split("")
        .map((char, idx) => (idx % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
        .join("");
}

/** Spam emojis at the text */
function emojiSpam(input: string): string {
    const emoji = ["😂", "🔥", "💯", "😍", "😜", "🤣", "👌", "💀"];
    let output = input;
    for (let i = 0; i < 5; i++) {
        output += ` ${emoji[Math.floor(Math.random() * emoji.length)]}`;
    }
    return output;
}

export default definePlugin({
    name: "BetterTextCommands",
    description: "Fun and playful text-based commands like mock, reverse, spooky, and more.",
    authors: [Devs.tiso],

    commands: [
        {
            name: "mockcase",
            description: "Transforms your message to MoCk CaSe.",
            options: [RequiredMessageOption],
            inputType: ApplicationCommandInputType.BOT,
            execute: opts => ({
                content: toMockCase(findOption(opts, "message", ""))
            }),
        },
        {
            name: "reverse",
            description: "Reverses your message.",
            options: [RequiredMessageOption],
            inputType: ApplicationCommandInputType.BOT,
            execute: opts => ({
                content: reverseText(findOption(opts, "message", ""))
            }),
        },
        {
            name: "spooky",
            description: "Spookifies your text with weird characters.",
            options: [RequiredMessageOption],
            inputType: ApplicationCommandInputType.BOT,
            execute: opts => ({
                content: spookyText(findOption(opts, "message", ""))
            }),
        },
        {
            name: "uwuify",
            description: "Makes your message cute and uwu.",
            options: [RequiredMessageOption],
            inputType: ApplicationCommandInputType.BOT,
            execute: opts => ({
                content: uwuifyText(findOption(opts, "message", ""))
            }),
        },
        {
            name: "sarcastic",
            description: "Makes your message sarcastic.",
            options: [RequiredMessageOption],
            inputType: ApplicationCommandInputType.BOT,
            execute: opts => ({
                content: sarcasticText(findOption(opts, "message", ""))
            }),
        },
        {
            name: "emoji-spam",
            description: "Spams your message with emojis.",
            options: [RequiredMessageOption],
            inputType: ApplicationCommandInputType.BOT,
            execute: opts => ({
                content: emojiSpam(findOption(opts, "message", ""))
            }),
        }
    ]
});

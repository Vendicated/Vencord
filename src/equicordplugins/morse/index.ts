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

import { ApplicationCommandInputType, ApplicationCommandOptionType } from "@api/Commands";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

const morseMap = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.",
    G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
    M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.",
    S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
    Y: "-.--", Z: "--..",
    0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
    5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
    " ": "/"
};

const toMorse = (text: string) => {
    return text.toUpperCase().split("").map(char => morseMap[char] ?? "").join(" ");
};

const fromMorse = (text: string) => {
    const reversedMap = Object.fromEntries(Object.entries(morseMap).map(([k, v]) => [v, k]));
    const raw = text.split(" ").map(code => reversedMap[code] ?? "").join("").toLowerCase();
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

// boo regex
const isMorse = (text: string) => /^[.\-/ ]+$/.test(text);

export default definePlugin({
    name: "Morse",
    description: "A slash command to translate to/from morse code.",
    authors: [EquicordDevs.zyqunix],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            name: "morse",
            description: "Translate to or from Morse code",
            options: [
                {
                    name: "text",
                    description: "Text to convert",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
            ],
            execute: opts => {
                const input = opts.find(o => o.name === "text")?.value as string;
                const output = isMorse(input) ? fromMorse(input) : toMorse(input);
                return {
                    content: `${output}`
                };
            },
        }
    ]
});

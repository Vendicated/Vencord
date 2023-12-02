/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { classNameFactory } from "@api/Styles";


export const cl = classNameFactory("vc-trans-");

interface TranslationData {
    src: string;
    sentences: {
        // 🏳️‍⚧️
        trans: string;
    }[];
}

export interface TranslationValue {
    src: string;
    text: string;
}

export async function translate(kind: "received" | "sent", text: string): Promise<TranslationValue> {
    const letters = {
        "a": "આ",
        "b": "ୈ",
        "c": "உ",
        "d": "ோ",
        "e": "క",
        "f": "෴",
        "g": "ส",
        "h": "฿",
        "i": "ັ",
        "j": "༃",
        "k": "༺",
        "l": "༰",
        "m": "༖",
        "n": "གྷ",
        "o": "ཛྷ",
        "p": "ི",
        "q": "ྨ",
        "r": "࿄",
        "s": "ྰ",
        "t": "ྫྷ",
        "u": "ဪ",
        "v": "ဿ",
        "w": "ၚ",
        "x": "Ⴀ",
        "y": "ྛ",
        "z": "འ",
        ":": "ಹ",
        " ": "࿐",
        "1": "໑",
        "2": "໒",
        "3": "໓",
        "4": "໔",
        "5": "໕",
        "6": "໖",
        "7": "໗",
        "8": "໘",
        "9": "໙",
        "0": "໐",
        "!": "ᆰ",
        "@": "ቧ",
        "#": "ኗ",
        "$": "ዘ",
        "%": "ጙ",
        "^": "ፚ",
        "&": "Ꭷ",
        "*": "Ꮪ",
        "(": "ᐧ",
        ")": "ᑦ",
        "-": "ᔆ",
        "_": "ᕂ",
        "=": "ᖆ",
        "+": "ᖼ",
        "[": "ᗄ",
        "]": "ᗿ",
        "{": "ᘇ",
        "}": "ᘿ",
        ";": "ᙈ",
        "'": "ᙿ",
        '"': "ᚆ",
        "<": "ᚾ",
        ">": "ᛚ",
        ",": "᛿",
        ".": "ᜂ",
        "/": "᜿",
        "?": "ᝆ",
        "`": "᝾",
        "~": "ឈ"
    };

    if (kind === "sent") {
        const translatedText = text.split("").map(char => letters[char] || char).join("");
        return {
            src: kind,
            text: translatedText
        };
    }

    const reversedLetters = Object.entries(letters).reduce((acc, [key, value]) => ({ ...acc, [value]: key }), {});
    const translatedText = text.split("").map(char => reversedLetters[char] || char).join("");
    return {
        src: kind,
        text: translatedText
    };
}

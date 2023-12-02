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

export async function translate(kind: "received" | "sent", text: string, version: number): Promise<TranslationValue> {
    const lettersv1 = {
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
        "~": "ឈ",
        "A": "ញ",
        "B": "ដ",
        "C": "ឋ",
        "D": "ឌ",
        "E": "ឍ",
        "F": "ណ",
        "G": "ត",
        "H": "ថ",
        "I": "ទ",
        "J": "ធ",
        "K": "ន",
        "L": "ប",
        "M": "ផ",
        "N": "ព",
        "O": "ភ",
        "P": "ម",
        "Q": "យ",
        "R": "រ",
        "S": "ល",
        "T": "វ",
        "U": "ឝ",
        "V": "ឞ",
        "W": "ស",
        "X": "ហ",
        "Y": "ឡ",
        "Z": "អ"

    };

    const lettersv2 = {
        "a": "ا",
        "b": "ب",
        "c": "ت",
        "d": "ث",
        "e": "ج",
        "f": "ح",
        "g": "خ",
        "h": "د",
        "i": "ذ",
        "j": "ر",
        "k": "ز",
        "l": "س",
        "m": "ش",
        "n": "ص",
        "o": "ض",
        "p": "ط",
        "q": "ظ",
        "r": "ع",
        "s": "غ",
        "t": "ف",
        "u": "ق",
        "v": "ك",
        "w": "ل",
        "x": "م",
        "y": "ن",
        "z": "ه",
        ":": "و",
        " ": "ى",
        "0": "ي",
        "1": "٠",
        "2": "١",
        "3": "٢",
        "4": "٣",
        "5": "٤",
        "6": "٥",
        "7": "٦",
        "8": "٧",
        "9": "٨",
        "!": "٩",
        "@": "٪",
        "#": "٫",
        "$": "٬",
        "%": "٭",
        "^": "ٮ",
        "&": "ٯ",
        "*": "ٰ",
        "(": "ٱ",
        ")": "ٲ",
        "-": "ٳ",
        "=": "ٴ",
        "+": "ٵ",
        "[": "ٶ",
        "]": "ٷ",
        "{": "ٸ",
        "}": "ٹ",
        ";": "ٺ",
        "'": "ٻ",
        ",": "ټ",
        ".": "ٽ",
        "<": "پ",
        ">": "ٿ",
        "/": "ڀ",
        "?": "ځ",
        "`": "ڂ",
        "~": "ڃ",
        "A": "ڄ",
        "B": "څ",
        "C": "چ",
        "D": "ڇ",
        "E": "ڈ",
        "F": "ډ",
        "G": "ڊ",
        "H": "ڋ",
        "I": "ڌ",
        "J": "ڍ",
        "K": "ڎ",
        "L": "ڏ",
        "M": "ڐ",
        "N": "ڑ",
        "O": "ڒ",
        "P": "ړ",
        "Q": "ڔ",
        "R": "ڕ",
        "S": "ږ",
        "T": "ڗ",
        "U": "ژ",
        "V": "ڙ",
        "W": "ښ",
        "X": "ڛ",
        "Y": "ڜ",
        "Z": "ڝ"
    };

    let letters;

    if (kind === "sent") {
        letters = version === 1 ? lettersv1 : lettersv2;
    } else {
        letters = text.split("").some(char => Object.values(lettersv2).includes(char)) ? lettersv2 : lettersv1;
    }

    if (kind === "sent") {
        const translatedText = text
            .split(" ")
            .map(word => {
                // Ignore links and words that start with '!'
                if (word.startsWith("http") || word.startsWith("!")) {
                    return word.replace("!", "");
                }
                // Translate other words
                return word.split("").map(char => letters[char] || char).join("");
            })
            .join(" ");
        return {
            src: kind,
            text: translatedText
        };
    }

    const reversedLetters = Object.entries(letters).reduce((acc, [key, value]) => ({ ...acc, [value as string]: key }), {});
    const translatedText = text
        .split(" ")
        .map(word => {
            // Ignore links and words that start with '!'
            if (word.startsWith("http") || word.startsWith("!")) {
                return word;
            }
            // Translate other words
            return word.split("").map(char => reversedLetters[char] || char).join("");
        })
        .join(" ");
    return {
        src: kind,
        text: translatedText
    };
}

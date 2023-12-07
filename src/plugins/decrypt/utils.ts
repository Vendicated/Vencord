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

export function encryptDecryptAPI(kind: "encrypt" | "decrypt", text: string): Promise<string> {
    return fetch(`https://api.dragzte.me/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    })
        .then(response => {
            console.log(response.text);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => data.text)
        .catch(error => {
            console.error("Failed to fetch from API:", error);
            return text;
        });
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
        "a": "ر",
        "b": "ز",
        "c": "س",
        "d": "ش",
        "e": "ص",
        "f": "ض",
        "g": "ط",
        "h": "ظ",
        "i": "ع",
        "j": "غ",
        "k": "ػ",
        "l": "ؼ",
        "m": "ؽ",
        "n": "ؾ",
        "o": "ؿ",
        "p": "ـ",
        "q": "ف",
        "r": "ق",
        "s": "ك",
        "t": "ل",
        "u": "م",
        "v": "ن",
        "w": "ه",
        "x": "",
        "y": "ى",
        "z": "",
        " ": "װ",
        ",": "׼",
        "?": "؏",
    };

    const cubes = {
        "a": "",
        "b": "",
        "c": "",
        "d": "🟨",
        "e": "",
        "f": "",
        "g": "",
        "h": "",
        "i": "",
        "j": "🟧",
        "k": "",
        "l": "",
        "m": "",
        "n": "",
        "o": "",
        "p": "🟪",
        "q": "🟧",
        "r": "",
        "s": "",
        "t": "",
        "u": "",
        "v": "🟨",
        "w": "",
        "x": "🟧",
        "y": "",
        "z": "🟦",
        " ": "",
        "?": "",
        "I": "",
    };

    let translatedText = "";

    const letters = version === 1 ? lettersv1 : version === 2 ? lettersv2 : cubes;


    if (version === 1) {
        return encryptDecryptAPI(kind === "sent" ? "encrypt" : "decrypt", text)
            .then(translatedText => {
                return {
                    src: kind,
                    text: translatedText + "​"
                };
            });
    } else {

        if (kind === "sent") {
            translatedText = await encryptDecryptAPI(kind === "sent" ? "encrypt" : "decrypt", text);
        } else {
            const reversedLetters = Object.entries(letters).reduce((acc, [key, value]) => ({ ...acc, [value as string]: key }), {});
            translatedText = text.split("").map(char => reversedLetters[char] || char).join("");
        }
    }

    return {
        src: kind,
        text: translatedText + "​"
    };
}

export function shouldTranslate(text: string): boolean {
    if (text.includes("​")) {
        return true;

    }
    return false;
}

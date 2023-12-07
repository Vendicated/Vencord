/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 dragdotpng and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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



export function translate(kind: "received" | "sent", text: string, version: number): TranslationValue {
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

    const letters = version === 1 ? lettersv1 : version === 2 ? lettersv2 : cubes;

    if (kind === "sent") {
        const translatedText = text
            .split("")
            .map(word => {
                // Ignore links and words that start with '!'
                if (word.startsWith("http") || word.startsWith("!")) {
                    return word.replace("!", "");
                }
                // Translate other words
                return word.split("").map(char => letters[char] || char).join("");
            })
            .join("");
        return {
            src: kind,
            text: translatedText + "​"
        };
    }

    const reversedLettersv1 = Object.entries(lettersv1).reduce((acc, [key, value]) => ({ ...acc, [value as string]: key }), {});
    const reversedLettersv2 = Object.entries(lettersv2).reduce((acc, [key, value]) => ({ ...acc, [value as string]: key }), {});
    const reversedcubes = Object.entries(cubes).reduce((acc, [key, value]) => ({ ...acc, [value as string]: key }), {});

    const translatedTextv1 = text.split("").map(char => reversedLettersv1[char] || char).join("");
    const translatedTextv2 = text.split("").map(char => reversedLettersv2[char] || char).join("");
    const translatedTextv3 = text.split("").map(char => reversedcubes[char] || char).join("");

    const unrecognizedCharsv1 = translatedTextv1.split("").filter(char => !Object.keys(lettersv1).includes(char)).length;
    const unrecognizedCharsv2 = translatedTextv2.split("").filter(char => !Object.keys(lettersv2).includes(char)).length;
    const unrecognizedCharsv3 = translatedTextv3.split("").filter(char => !Object.keys(cubes).includes(char)).length;

    const minUnrecognizedChars = Math.min(unrecognizedCharsv1, unrecognizedCharsv2, unrecognizedCharsv3);
    const translatedText = minUnrecognizedChars === unrecognizedCharsv1 ? translatedTextv1 : minUnrecognizedChars === unrecognizedCharsv2 ? translatedTextv2 : translatedTextv3;
    return {
        src: kind,
        text: translatedText
    };
}

export function shouldTranslate(text: string): boolean {
    if (text.includes("​")) {
        return true;

    }
    return false;
}

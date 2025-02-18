/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const Flags: { NONE: number, START: number, END: number, START_AND_END: number; } = {
    NONE: 0,
    START: 1,
    END: 2,
    START_AND_END: 3
};

function matchKeywords(text: string, keywords: Array<string>, allowed: Array<string> = []): [boolean, string | null] { // [boolean, string | null]
    for (const keyword of keywords) {
        if (matchKeyword(text, keyword, allowed)) {
            return [true, keyword];
        }
    }
    return [false, null];
}


function matchKeyword(text: string, keyword: string, allowed: Array<string> = []): boolean | null {
    // Determine the flag based on the keyword
    const flag: number = (keyword.startsWith("*") ? Flags.START : 0) + (keyword.endsWith("*") ? Flags.END : 0);

    // Remove the asterisks from the keyword if necessary
    if (flag === Flags.START || flag === Flags.START_AND_END) {
        keyword = keyword.slice(1);
    }
    if (flag === Flags.END || flag === Flags.START_AND_END) {
        keyword = keyword.slice(0, -1);
    }

    // Check if the text is an exact match to the keyword, or their size don't match
    if (text === keyword) {
        return true;
    } else if (text.length < keyword.length) {
        return false;
    }

    let tok: string = "";
    let matchingIndex: number = 0;
    let beforeSpace: boolean | null = null;
    let index2: number = 0;


    for (let index = 0; index < text.length; index++) {
        const char = text[index];

        // Continue if the character does not match the current character in the keyword
        if (char !== keyword[matchingIndex]) {
            if (matchingIndex !== 0) {
                matchingIndex = 0;
                tok = "";
                beforeSpace = false;
            }
            continue;
        }

        // If the character matches the first character in the keyword
        if (matchingIndex === 0) {
            index2 = index - 1;
            while (index2 !== -1 && text[index2] !== " ") {
                const char2: string = text[index2];
                tok += char2;
                index2--;
            }
            if (index === 0 || !tok) {
                beforeSpace = true;
            }
            tok = tok.split("").reverse().join("");
        }

        tok += char;
        matchingIndex++;

        // If the entire keyword is matched
        if (matchingIndex === keyword.length) {
            index += 1;
            index2 = index;
            while (index !== text.length && text[index] !== " ") {
                const char2: string = text[index];
                tok += char2;
                index++;
            }

            // Check if the flag is START_AND_END and the token is not found in the allowed words
            if (flag === Flags.START_AND_END && !matchKeywords(tok, allowed)[0]) {
                return true;
            }
            // Check if the flag is NONE and the token is not found in the allowed words
            else if (flag === Flags.NONE && ((index2 !== text.length && text[index2] === " ") || index2 === text.length) && beforeSpace && !matchKeywords(tok, allowed)[0]) {
                return true;
            }
            // Check if the flag is START and the token is not found in the allowed words
            else if (flag === Flags.START && ((index2 !== text.length && text[index2] === " ") || index2 === text.length) && !matchKeywords(tok, allowed)[0]) { // matchKeywords gives null
                return true;
            }
            // Check if the flag is END and the token is not found in the allowed words
            else if (flag === Flags.END && beforeSpace && !matchKeywords(tok, allowed)[0]) {
                return true;
            }

            matchingIndex = 0;
            tok = "";
            beforeSpace = false;
        }
        // If the character matches the current character in the keyword
        else if (char === keyword[matchingIndex]) {
            index--;
            while (index !== -1 && text[index] !== " ") {
                const char2: string = text[index];
                tok += char2;
                index--;
            }
            if (index === 0 || !tok) {
                beforeSpace = true;
            }
            tok = tok.split("").reverse().join("");
            matchingIndex++;
            tok += char;
        }
    }
    return null;
}

export { matchKeyword, matchKeywords };

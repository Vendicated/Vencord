/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// discord automod parser

// an enumeration class Flags using an object
const Flags = {
    NONE: 0,
    START: 1,
    END: 2,
    START_AND_END: 3
};

// a function match_keywords that takes a text and an array of keywords as input
function match_keywords(text, keywords, allowed = []) {
    for (const keyword of keywords) {
        if (match_keyword(text, keyword, allowed)) {
            return [true, keyword]; // Return true if the keyword is found
        }
    }
    return [false, null]; // Return false if none of the keywords are found
}

// a function match_keyword that takes a text, a keyword, and an optional array of allowed words as input
function match_keyword(text, keyword, allowed = []) {
    // Determine the flag based on the keyword
    const flag = (keyword.startsWith("*") ? Flags.START : 0) + (keyword.endsWith("*") ? Flags.END : 0);

    // Remove the asterisks from the keyword if necessary
    if (flag === Flags.START || flag === Flags.START_AND_END) {
        keyword = keyword.slice(1);
    }
    if (flag === Flags.END || flag === Flags.START_AND_END) {
        keyword = keyword.slice(0, -1);
    }

    // Check if the text is an exact match to the keyword
    if (text === keyword) {
        return true;
    } else if (text.length < keyword.length) {
        return false;
    }

    let tok = "";
    let matchingIndex = 0;
    let beforeSpace = null;
    let index2 = 0;

    // Iterate over each character in the text
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
                const char2 = text[index2];
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
                const char2 = text[index];
                tok += char2;
                index++;
            }

            // Check if the flag is START_AND_END and the token is not found in the allowed words
            if (flag === Flags.START_AND_END && !match_keywords(tok, allowed)[0]) {
                return true;
            }
            // Check if the flag is NONE and the token is not found in the allowed words
            else if (flag === Flags.NONE && ((index2 !== text.length && text[index2] === " ") || index2 === text.length) && beforeSpace && !match_keywords(tok, allowed)[0]) {
                return true;
            }
            // Check if the flag is START and the token is not found in the allowed words
            else if (flag === Flags.START && ((index2 !== text.length && text[index2] === " ") || index2 === text.length) && !match_keywords(tok, allowed)[0]) { // match_keywords gives null
                return true;
            }
            // Check if the flag is END and the token is not found in the allowed words
            else if (flag === Flags.END && beforeSpace && !match_keywords(tok, allowed)[0]) {
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
                const char2 = text[index];
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
}

function tests() {
    const words = [
        "this is another one but teststick on the side like this otest",
        "test here",
        "look guys i am testing this", "this is a test message",
        "this is another one but teststick on the side like this otest",
        "test",
        "whjilouktyjrthtestergwew.umng",
        "startest only will work with the start flag or any",
        "there is nothing here!"
    ];


    const patterns = ["*test", "test*", "*test*", "test"];

    for (let i = 0; i < words.length; i++) {
        console.log(`test ${i + 1}. ${JSON.stringify(words[i])}`);
        for (let j = 0; j < patterns.length; j++) {
            console.log("pattern:", JSON.stringify(patterns[j]));
            console.log("match?:", match_keyword(words[i], patterns[j], []));
        }
    }
    console.log("tests ended");
}

export { match_keyword,match_keywords };

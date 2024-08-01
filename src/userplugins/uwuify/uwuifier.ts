/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "./index";

class Uwuifier {
    uwuMap: (string | RegExp)[][];
    exclamations: string[];
    urlPattern: RegExp;

    constructor() {
        this.exclamations = ["!?", "?!!", "?!?1", "!!11", "?!?!"];
        this.uwuMap = [
            [/[rl]/g, "w"],
            [/[RL]/g, "W"],
            [/n([aeiou])/g, "ny$1"],
            [/N([aeiou])/g, "Ny$1"],
            [/N([AEIOU])/g, "Ny$1"],
            [/ove/g, "uv"],
        ];
        this.urlPattern = /(https?:\/\/[^\s]+)/g;
    }

    uwuifyWords(sentence: string): string {
        const words = sentence.split(" ");
        const uwuifiedSentence = words.map(word => {
            if (this.urlPattern.test(word)) return word;
            for (const [oldWord, newWord] of this.uwuMap) {
                if (Math.random() > settings.store.wordChance) continue;
                // @ts-ignore
                word = word.replace(oldWord, newWord);
            }
            return word;
        }).join(" ");
        return uwuifiedSentence;
    }

    uwuifySpaces(sentence: string): string {
        const words = sentence.split(" ");
        const faceThreshold = settings.store.faceChance;
        const stutterThreshold = settings.store.stutterChance + faceThreshold;

        const uwuifiedSentence = words.map((word, index) => {
            if (this.urlPattern.test(word)) return word;
            const random = Math.random();
            const [firstCharacter] = word;

            if (random <= faceThreshold && settings.store.faceChance) {
                const faces = settings.store.faces.split(",");
                word += " " + faces[Math.floor(Math.random() * faces.length)];
                checkCapital();
            } else if (random <= stutterThreshold) {
                const stutter = Math.floor(Math.random() * 3);
                return (firstCharacter + "-").repeat(stutter) + word;
            }

            function checkCapital() {
                if (firstCharacter !== firstCharacter.toUpperCase()) return;
                if (index === 0) {
                    word = firstCharacter.toLowerCase() + word.slice(1);
                } else {
                    const previousWord = words[index - 1];
                    const previousWordLastChar = previousWord[previousWord.length - 1];
                    const prevWordEndsWithPunctuation = /[.!?\\-]/.test(previousWordLastChar);
                    if (!prevWordEndsWithPunctuation) return;
                    word = firstCharacter.toLowerCase() + word.slice(1);
                }
            }
            return word;
        }).join(" ");
        return uwuifiedSentence;
    }

    uwuifyExclamations(sentence: string): string {
        const words = sentence.split(" ");
        const pattern = /[?!]+$/;

        const uwuifiedSentence = words.map(word => {
            if (this.urlPattern.test(word)) return word;
            if (!pattern.test(word) || Math.random() > settings.store.exclamationChance) {
                return word;
            }
            word = word.replace(pattern, "");
            word += this.exclamations[Math.floor(Math.random() * this.exclamations.length)];
            return word;
        }).join(" ");
        return uwuifiedSentence;
    }

    uwuifySentence(sentence: string): string {
        let uwuifiedString = sentence;
        uwuifiedString = this.uwuifyWords(uwuifiedString);
        uwuifiedString = this.uwuifyExclamations(uwuifiedString);
        uwuifiedString = this.uwuifySpaces(uwuifiedString);
        return uwuifiedString;
    }
}

export default Uwuifier;

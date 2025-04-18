/*
 * Tallycord, a Discord client mod
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
        let uwuifiedString = owoify(sentence);
        uwuifiedString = this.uwuifyWords(uwuifiedString);
        uwuifiedString = this.uwuifyExclamations(uwuifiedString);
        uwuifiedString = this.uwuifySpaces(uwuifiedString);
        return uwuifiedString;
    }
}

export default Uwuifier;
function owoify(text) {
    const wordMap = {
        love: 'wuv',
        mr: 'mistuh',
        dog: 'doggo',
        cat: 'kitteh',
        hello: 'henwo',
        hell: 'heck',
        fuck: 'fwick',
        fuk: 'fwick',
        shit: 'shoot',
        friend: 'fwend',
        stop: 'stawp',
        god: 'gosh',
        dick: 'peepee',
        penis: 'peepee',
        damn: 'darn'
    };
    const prefixes = [
        'OwO',
        '*nuzzles*',
        '*blushes*',
        '*giggles*',
        'hehe'
    ];
    const suffixes = [
        '(ﾉ´ з `)ノ',
        '( ´ ▽ ` ).｡ｏ♡',
        '(´,,•ω•,,)♡',
        '(*≧▽≦)',
        'ɾ⚈▿⚈ɹ',
        '( ﾟ∀ ﾟ)',
        '( ・ ̫・)',
        '( •́ .̫ •̀ )',
        '(▰˘v˘▰)',
        '(・ω・)',
        '✾(〜 ☌ω☌)〜✾',
        '(ᗒᗨᗕ)',
        '(・`ω´・)',
        ':3',
        '>:3',
        'hehe',
        'xox',
        '>3<',
        'murr~',
        'UwU',
        '*gwomps*'
    ];

    // Word wepwacement
    text = text.replace(/\b\w+\b/g, word => {
        const lower = word.toLowerCase();
        return wordMap[lower] ? wordMap[lower] : word;
    });

    // `w` fow `l` and `r`
    text = text.replace(/[rl]/gi, match =>
        match.charCodeAt(0) < 97 ? 'W' : 'w'
    );

    // Stuttew
    text = text
        .split(' ')
        .map(word => (Math.random() < 0.1 ? `${word[0]}-${word}` : word))
        .join(' ');

    // Pwobabiwistic Pwefix and Suffix
    if (Math.random() < 0.05) text = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${text}`;
    if (Math.random() < 0.15) text = `${text} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;

    return text;
}

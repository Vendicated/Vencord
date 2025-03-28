/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "./index";



export function random(input: string) {
    return randomizeTyping(input, settings.store.replaceChance, settings.store.spaceChance);
}

function randomizeTyping(input, charSubProb, spaceInsertProb) {
    const qwertyMap = {
        q: ['w', 'a', '1', '2'],
        w: ['q', 'e', 's', '2', '3'],
        e: ['w', 'r', 'd', '3', '4'],
        r: ['e', 't', 'f', '4', '5'],
        t: ['r', 'y', 'g', '5', '6'],
        y: ['t', 'u', 'h', '6', '7'],
        u: ['y', 'i', 'j', '7', '8'],
        i: ['u', 'o', 'k', '8', '9'],
        o: ['i', 'p', 'l', '9', '0'],
        p: ['o', '[', ']', '-', '0'],
        a: ['q', 's', 'z'],
        s: ['a', 'd', 'w', 'x'],
        d: ['s', 'f', 'e', 'c'],
        f: ['d', 'g', 'r', 'v'],
        g: ['f', 'h', 't', 'b'],
        h: ['g', 'j', 'y', 'n'],
        j: ['h', 'k', 'u', 'm'],
        k: ['j', 'l', 'i'],
        l: ['k', 'o', ';', ',', '.'],
        z: ['a', 'x'],
        x: ['z', 'c', 's'],
        c: ['x', 'v', 'd'],
        v: ['c', 'b', 'f'],
        b: ['v', 'n', 'g'],
        n: ['b', 'm', 'h'],
        m: ['n', 'j', ',', '.'],
        '[': ['p', ']'],
        ']': ['[', 'p'],
        ';': ['l', ',', '.'],
        ',': ['m', 'l', ';', '.'],
        '.': [',', 'l', ';'],
        '-': ['p', '0', '=']
    };

    // Function to get a nearby character from the qwerty map
    function getRandomNearbyChar(char) {
        const lowerChar = char.toLowerCase();
        if (qwertyMap[lowerChar]) {
            const nearbyChars = qwertyMap[lowerChar];
            const randomChar = nearbyChars[Math.floor(Math.random() * nearbyChars.length)];
            return char === char.toUpperCase() ? randomChar.toUpperCase() : randomChar;
        }
        return char;
    }

    // Function to insert random spaces based on the probability
    function insertRandomSpace(word) {
        const newWord = word.split('').reduce((acc, char) => {
            acc += char;
            if (Math.random() < spaceInsertProb) {
                acc += ' ';
            }
            return acc;
        }, '');
        return newWord.trim();
    }

    // Main function to process the input
    return input.split('').map(char => {
        if (/[a-zA-Z0-9\[\];,\.-]/.test(char) && Math.random() < charSubProb) {
            return getRandomNearbyChar(char);
        }
        return char;
    }).join('').split(' ').map(insertRandomSpace).join(' ');
}

// Example usag

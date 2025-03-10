
/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
 *
 * Owoify Plugin for Vencord
 * Copyright (c) 2025 nate (nate.fun)
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
import {
    MessageObject
} from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
const settings = definePluginSettings({
    isEnabled: {
        type: OptionType.BOOLEAN,
        description: "toggle owoify",
        default: true,
    }
});
export default definePlugin({
    name: "owoify",
    description: "owoify your messages >_<",
    authors: [Devs.nate],
    settings,
    onBeforeMessageSend(_, msg) {
        return this.onSend(msg);
    },
    onBeforeMessageEdit(_cid, _mid, msg) {
        return this.onSend(msg);
    },
    owoify(text: string) {
        // Modified from https://aqua-lzma.github.io/OwOify/discord
        // Default settings and mappings:
        const rltow = true;
        const yaftern = true;
        const repeaty = true;
        const replaceWords = true;
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
        const doStutter = true;
        const stutterChance = 0.1;
        const doPrefixes = true;
        const prefixChance = 0.05;
        const prefixes = [
            'OwO',
            'OwO whats this?',
            '*unbuttons shirt*',
            '*nuzzles*',
            '*waises paw*',
            '*notices bulge*',
            '*blushes*',
            '*giggles*',
            'hehe'
        ].sort((a, b) => a.length - b.length);
        const doSuffixes = true;
        const suffixChance = 0.15;
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
        ].sort((a, b) => a.length - b.length);

        // Helper: Replace words based on a map (case-sensitive aware).
        function replaceAll(input, map) {
            // Build a regex from all wordMap keys, capturing whole words only.
            const source = Object.keys(map).map(i => `\\b${i}`);
            const re = new RegExp(`(?:${source.join(')|(?:')})`, 'gi');

            return input.replace(re, match => {
                let out = map[match.toLowerCase()];
                // If original is mostly uppercase, convert replacement to uppercase:
                if ((match.match(/[A-Z]/g) || []).length > match.length / 2) {
                    out = out.toUpperCase();
                }
                return out;
            });
        }

        // Helper: Weighted random choice (shorter strings have higher probability).
        function weightedRandom(list) {
            const max = list[list.length - 1].length + 1;
            let acc = 0;
            const weights = list.map(i => (acc += max - i.length));
            const random = Math.floor(Math.random() * acc);
            for (let [index, weight] of weights.entries()) {
                if (random < weight) {
                    return list[index];
                }
            }
            return list[list.length - 1]; // Fallback, though practically never reached.
        }

        // 1) Replace words (wordMap):
        if (replaceWords) {
            text = replaceAll(text, wordMap);
        }

        // 2) Replace 'r'/'l' with 'w':
        if (rltow) {
            text = text.replace(/[rl]/gi, match =>
                match.charCodeAt(0) < 97 ? 'W' : 'w'
            );
        }

        // 3) Insert 'y' after 'n' followed by a vowel:
        if (yaftern) {
            text = text.replace(/n[aeiou]/gi, match =>
                match[0] + (match.charCodeAt(1) < 97 ? 'Y' : 'y') + match[1]
            );
        }

        // 4) Repeat final “y” part (like “funny bunny” style):
        if (repeaty) {
            text = text.replace(/\b(?=.*[aeiou])(?=[a-vx-z])[a-z]{4,}y\b/gi, match => {
                const w = match.charCodeAt(0) < 97 ? 'W' : 'w';
                const matchResult = match.match(/.[aeiouy].*/i);
                const vowelPortion = matchResult ? matchResult[0].slice(1) : '';
                return `${match} ${w}${vowelPortion}`;
            });
        }

        // 5) Optional stutter:
        if (doStutter) {
            text = text.split(' ').map(word => {
                if (!word || !word[0].match(/[a-z]/i)) return word;
                let result = word;
                while (Math.random() < stutterChance) {
                    result = `${word[0]}-${result}`;
                }
                return result;
            }).join(' ');
        }

        // 6) Optional prefix:
        if (doPrefixes && Math.random() < prefixChance) {
            text = `${weightedRandom(prefixes)} ${text}`;
        }

        // 7) Optional suffix:
        if (doSuffixes && Math.random() < suffixChance) {
            text = `${text} ${weightedRandom(suffixes)}`;
        }

        return text;
    },

    onSend(msg: MessageObject) {
        if (settings.store.isEnabled) {
            msg.content = this.owoify(msg.content);
        }
    },
});

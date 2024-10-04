/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { findOption, OptionalMessageOption } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// Freaky Font Map https://c.r74n.com/converter/freaky-text
const scriptFontMap: { [key: string]: string; } = {
    a: "𝓪", b: "𝓫", c: "𝓬", d: "𝓭", e: "𝓮", f: "𝓯", g: "𝓰",
    h: "𝓱", i: "𝓲", j: "𝓳", k: "𝓴", l: "𝓵", m: "𝓶", n: "𝓷",
    o: "𝓸", p: "𝓹", q: "𝕢", r: "𝓻", s: "𝓼", t: "𝓽", u: "𝓾",
    v: "𝓿", w: "𝔀", x: "𝔁", y: "𝔂", z: "𝔃",
    A: "𝓐", B: "𝓑", C: "𝓒", D: "𝓓", E: "𝓔", F: "𝓕", G: "𝓖",
    H: "𝓗", I: "𝓘", J: "𝓙", K: "𝓚", L: "𝓛", M: "𝓜", N: "𝓝",
    O: "𝓞", P: "𝓟", Q: "𝓠", R: "𝓡", S: "𝓢", T: "𝓣", U: "𝓤",
    V: "𝓥", W: "𝓦", X: "𝓧", Y: "𝓨", Z: "𝓩"
};

// Define plugin
export default definePlugin({
    name: "FreakyFont",
    description: "Converts your message to a freaky font",
    authors: [Devs.name],
    commands: [
        {
            name: "freaky",
            description: "Convert your message to a freaky font",
            options: [OptionalMessageOption],
            execute: opts => {
                const text = findOption(opts, "message", "");
                const convertedText = text.split('').map(char => scriptFontMap[char] || char).join('');
                return {
                    content: convertedText
                };
            }
        }
    ]
});

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

import { findOption, RequiredMessageOption } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const endings = [
    "rawr x3",
    "OwO",
    "UwU",
    "o.O",
    "-.-",
    ">w<",
    "(⑅˘꒳˘)",
    "(ꈍᴗꈍ)",
    "(˘ω˘)",
    "(U ᵕ U❁)",
    "σωσ",
    "òωó",
    "(///ˬ///✿)",
    "(U ﹏ U)",
    "( ͡o ω ͡o )",
    "ʘwʘ",
    ":3",
    ":3", // important enough to have twice
    "XD",
    "nyaa~~",
    "mya",
    ">_<",
    "😳",
    "🥺",
    "😳😳😳",
    "rawr",
    "^^",
    "^^;;",
    "(ˆ ﻌ ˆ)♡",
    "^•ﻌ•^",
    "/(^•ω•^)",
    "(✿oωo)"
];

const replacements = [
    ["small", "smol"],
    ["cute", "kawaii~"],
    ["fluff", "floof"],
    ["love", "luv"],
    ["stupid", "baka"],
    ["what", "nani"],
    ["meow", "nya~"],
];

function selectRandomElement(arr) {
    // generate a random index based on the length of the array
    const randomIndex = Math.floor(Math.random() * arr.length);

    // return the element at the randomly generated index
    return arr[randomIndex];
}


function uwuify(message: string): string {
    message = message.toLowerCase();
    // words
    for (const pair of replacements) {
        message = message.replaceAll(pair[0], pair[1]);
    }
    message = message
        .replaceAll(/([ \t\n])n/g, "$1ny") // nyaify
        .replaceAll(/[lr]/g, "w") // [lr] > w
        .replaceAll(/([ \t\n])([a-z])/g, (_, p1, p2) => Math.random() < .5 ? `${p1}${p2}-${p2}` : `${p1}${p2}`) // stutter
        .replaceAll(/([^.,!][.,!])([ \t\n])/g, (_, p1, p2) => `${p1} ${selectRandomElement(endings)}${p2}`); // endings
    return message;
}



// actual command declaration
export default definePlugin({
    name: "UwUifier",
    description: "Simply uwuify commands",
    authors: [Devs.echo, Devs.skyevg],
    dependencies: ["CommandsAPI"],

    commands: [
        {
            name: "uwuify",
            description: "uwuifies your messages",
            options: [RequiredMessageOption],

            execute: opts => ({
                content: uwuify(findOption(opts, "message", "")),
            }),
        },
    ],
});

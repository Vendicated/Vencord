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
    "owo", "UwU", ">w<", "^w^", "●w●", "☆w☆", "𝗨𝘄𝗨", "(ᗒᗨᗕ)", "(▰˘v˘▰)",
    "( ´ ▽ ` ).｡ｏ♡", "*unbuttons shirt*", ">3<", ">:3", ":3", "murr~",
    "♥(。U ω U。)", "(˘ε˘)", "*screams*", "*twerks*", "*sweats*",
];

const replacements = [
    ["love", "wuv"],
    ["mr", "mistuh"],
    ["dog", "doggo"],
    ["cat", "kitteh"],
    ["hello", "henwo"],
    ["hell", "heck"],
    ["fuck", "fwick"],
    ["fuk", "fwick"],
    ["shit", "shoot"],
    ["friend", "fwend"],
    ["stop", "stawp"],
    ["god", "gosh"],
    ["dick", "peepee"],
    ["penis", "bulge"],
    ["damn", "darn"],
];


function uwuify(message: string): string {
    return message
        .split(" ")
        .map(w => {
            let owofied = false;
            const lowerCase = w.toLowerCase();
            // return if the word is too short - uwuifying short words makes them unreadable
            if (w.length < 4) {
                return w;
            }

            // replacing the words based on the array on line 29
            for (const [find, replace] of replacements) {
                if (w.includes(find)) {
                    w = w.replace(find, replace);
                    owofied = true;
                }
            }
            // these are the biggest word changes. if any of these are done we dont do the
            // ones after the isowo check. to keep the words somewhat readable
            if (lowerCase.includes("u") && !lowerCase.includes("uwu")) {
                w = w.replace("u", "UwU");
                owofied = true;
            }
            if (lowerCase.includes("o") && !lowerCase.includes("owo")) {
                w = w.replace("o", "OwO");
                owofied = true;
            }
            if (lowerCase.endsWith("y") && w.length < 7) {
                w = w + " " + "w" + w.slice(1);
                owofied = true;
            }

            // returning if word has been already uwuified - to prevent over-uwuifying
            if (owofied) {
                return w;
            }

            // more tiny changes - to keep the words that passed through the latter changes uwuified
            if (!lowerCase.endsWith("n")) {
                w = w.replace("n", "ny");
            }
            if (Math.floor(Math.random() * 2) === 1) {
                w.replace("s", "sh");
            }
            if (Math.floor(Math.random() * 5) === 3 && !owofied) {
                w = w[0] + "-" + w[0] + "-" + w;
            }
            if (Math.floor(Math.random() * 5) === 3) {
                w =
                    w +
                    " " +
                    endings[Math.floor(Math.random() * endings.length)];
            }
            w = w.replaceAll("r", "w").replaceAll("l", "w");
            return w;
        }).join(" ");
}



// actual command declaration
export default definePlugin({
    name: "UwUifier",
    description: "Simply uwuify commands",
    authors: [Devs.echo],
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

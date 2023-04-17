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
import { addPreSendListener, MessageObject, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import settings from "./settings";

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


function uwuify(inputString: string): string {
    const words = inputString.split(" ");
    let outputString = "";

    for (let i = 0; i < words.length; i++) { // for loop to check for links, and possibly more in the future
        const word = words[i];
        if (word.startsWith("http://") || word.startsWith("https://")) {
            outputString += word + " ";
            continue;
        }
        const transformedWord = word // skye's regex replacement, tho a bit tweaked
            .replaceAll(/([ \t\n])n/g, "$1ny")
            .replaceAll(/[lr]/g, "w")
            .replaceAll(/(^|\s)(\S)/g, (_, p1, p2) => `${p1}${Math.random() < .5 ? `${p2}-${p2}` : p2}`)
            .replaceAll(/([^.,!][.,!])(\s|$)/g, (_, p1, p2) => `${p1} ${selectRandomElement(endings)}${p2}`);
        outputString += transformedWord + " ";
    }

    return outputString.trim();
}



// actual command declaration
export default definePlugin({
    name: "UwUifier",
    description: "spice up your messages with a little bit of uwu",
    authors: [Devs.echo, Devs.skyevg],
    dependencies: ["CommandsAPI", "MessageEventsAPI"],
    options: {
        shouldAutoUwuify: {
            description: "automatically uwuifies your messages without using the command",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        },
    },

    addPrefix(_, msg: MessageObject) {
        msg.content = uwuify(msg.content);
    },

    start() {
        if (settings.shouldAutoUwuify) {
            this.preSend = addPreSendListener(this.addPrefix);
        }
    },

    stop() {
        if (settings.shouldAutoUwuify) {
            removePreSendListener(this.preSend);
        }
    },
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

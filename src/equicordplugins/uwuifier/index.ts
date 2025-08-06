/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 exhq
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
import { addMessagePreEditListener, addMessagePreSendListener, MessageObject, removeMessagePreEditListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

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
    ":3", // important enough to have thrice
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
    ["cute", "kawaii"],
    ["fluff", "floof"],
    ["love", "luv"],
    ["stupid", "baka"],
    ["what", "nani"],
    ["meow", "nya"],
    ["hello", "hewwo"],
];

const settings = definePluginSettings({
    uwuEveryMessage: {
        description: "Make every single message uwuified",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    },
    uwuEverything: {
        description: "Makes *all* text uwuified - really bad idea",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    }
});

function selectRandomElement(arr) {
    // generate a random index based on the length of the array
    const randomIndex = Math.floor(Math.random() * arr.length);

    // return the element at the randomly generated index
    return arr[randomIndex];
}
const isOneCharacterString = (str: string): boolean => {
    return str.split("").every((char: string) => char === str[0]);
};

function replaceString(inputString) {
    let replaced = false;
    for (const replacement of replacements) {
        const regex = new RegExp(`\\b${replacement[0]}\\b`, "gi");
        if (regex.test(inputString)) {
            inputString = inputString.replace(regex, replacement[1]);
            replaced = true;
        }
    }
    return replaced ? inputString : false;
}

function uwuify(message: string): string {
    const rule = /\S+|\s+/g;
    const words: string[] | null = message.match(rule);
    let answer = "";

    if (words === null) return "";

    for (let i = 0; i < words.length; i++) {
        if (isOneCharacterString(words[i]) || words[i].startsWith("https://")) {
            answer += words[i];
            continue;
        }

        if (!replaceString(words[i])) {
            answer += words[i]
                .replace(/n(?=[aeo])/g, "ny")
                .replace(/l|r/g, "w");
        } else answer += replaceString(words[i]);

    }

    answer += " " + selectRandomElement(endings);
    return answer;
}

function uwuifyArray(arr) {
    const newArr = [...arr];

    newArr.forEach((item, index) => {
        if (Array.isArray(item)) {
            newArr[index] = uwuifyArray(item);
        } else if (typeof item === "string") {
            newArr[index] = uwuify(item);
        }
    });

    return newArr;
}


// actual command declaration
export default definePlugin({
    name: "UwUifier",
    description: "Make everything uwu",
    authors: [Devs.amy],
    dependencies: ["MessageEventsAPI"],
    settings,

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

    patches: [
        {
            find: ".isPureReactComponent=!0;",
            predicate: () => settings.store.uwuEverything,
            replacement: {
                match: /(?<=.defaultProps\)void 0.{0,60})(\i)\)/,
                replace: "$self.uwuifyProps($1))"
            }
        }
    ],

    uwuifyProps(props: any) {
        if (!props.children) return props;
        if (typeof props.children === "string") props.children = uwuify(props.children);
        else if (Array.isArray(props.children)) props.children = uwuifyArray(props.children);
        return props;
    },

    onSend(msg: MessageObject) {
        // Only run when it's enabled
        if (settings.store.uwuEveryMessage) {
            msg.content = uwuify(msg.content);
        }
    },

    start() {
        this.preSend = addMessagePreSendListener((_, msg) => this.onSend(msg));
        this.preEdit = addMessagePreEditListener((_cid, _mid, msg) =>
            this.onSend(msg)
        );
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
        removeMessagePreEditListener(this.preEdit);
    },
});

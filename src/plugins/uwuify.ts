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
import { addPreEditListener, addPreSendListener, MessageObject, removePreEditListener, removePreSendListener } from "@api/MessageEvents";
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

const settings = definePluginSettings({
    uwuEveryMessage: {
        description: "Make every single message uwuified",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    }
});

function selectRandomElement(arr) {
    // generate a random index based on the length of the array
    const randomIndex = Math.floor(Math.random() * arr.length);

    // return the element at the randomly generated index
    return arr[randomIndex];
}

function is_whitespace(s : string) : bool{
    return s.trim() === ""
}

function is_nonreplace(w : any) : bool{
    return w.text.startsWith("https://") || w.text.startsWith("http://")
}

function uwuify_word(w : any) : any{
    if(is_nonreplace(w)){
        return w;
    }

    // Nyaify
    if( w.text.startsWith("n") ){
        w.text = "ny"+w.text.slice(1)
    }
    else if(w.text.startsWith("N")){
        w.text = "Ny" + w.text.slice(1)
    }

    // replace lr's with w's
    w.text = w.text.replaceAll(/[lr]/g, "w")


    // stutter (50% chance)
    if(Math.random() < 0.5){
        w.text = w.text[0]+"-"+w.text
    }

    if(/[.,!?]$/.test(w.text)){
        w.text += ` ${selectRandomElement(endings)}`
    }
    return w
}

function uwuify(message: string): string {

    // split message into a sequence of words
    // each word remembers its preceding whitespace to
    // make final reconstruction easier

    let words = []

    let current_whitespace : string = "";
    let current_word : string = "";

    for(let char of message){
        if(current_word === "" && is_whitespace(char)){
            current_whitespace += char;
        }
        else if(is_whitespace(char)){
            words.push({
                text: current_word,
                prespace: current_whitespace
            })
            current_word = ""
            current_whitespace = char
        }
        else{
            current_word += char
        }
    }

    if(!is_whitespace(current_word)){
        words.push({
        text: current_word,
        prespace: current_whitespace})
    }

    let new_words = []
    for(let word of words){
        // Granular replacement rules so that URLS don't get destroyed
        // we are banking on the fact that most urls dont contain spaces
        // and those that do are breaking the standard anyway so screw them
        if(is_nonreplace(word)){
            new_words.push(word)
            continue;
        }
        for (const pair of replacements) {
            word.text = word.text.replaceAll(pair[0], pair[1])
        }
        new_words.push(word)
    }
    words = new_words

    words = words.map( word => uwuify_word(word) )

    return words.reduce((s, word) =>  s += word.prespace + word.text, "")
}



// actual command declaration
export default definePlugin({
    name: "UwUifier",
    description: "Simply uwuify commands",
    authors: [Devs.echo, Devs.skyevg, Devs.PandaNinjas],
    dependencies: ["CommandsAPI", "MessageEventsAPI"],
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

    onSend(msg: MessageObject) {
        // Only run when it's enabled
        if (settings.store.uwuEveryMessage) {
            msg.content = uwuify(msg.content);
        }
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.onSend(msg));
        this.preEdit = addPreEditListener((_cid, _mid, msg) =>
            this.onSend(msg)
        );
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    },
});

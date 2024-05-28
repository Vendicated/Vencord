/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findOption, OptionalMessageOption } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";


const randomInt = (min, max) => { return Math.floor(Math.random() * (max + 1 - min)) + min; };

const settings = definePluginSettings({
    enabledSuffixes: {
        description: "Suffixes like UwU and OwO",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    replacements: {
        description: "Replacements like bye -> bai, cool -> kewl, and what -> wat",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    minimumWordLength: {
        description: "Minimum letters before a word gets UwU'd (3 removes bye to bai, etc)",
        type: OptionType.NUMBER,
        default: 0,
        restartNeeded: false
    },
});


const endings: string[] = [
    "UwU",
    "OwO",
    "Nya~",
    ":3",
    ">w<",
    "^-^",
    "^_^",
    "^w^",
    ">:3",
    ":>"
];

const substitutions = {
    "r": "w",
    "l": "w",
    "no": "nyo",
    "what": "wat",
    "na": "nya",
    "ma": "mya",
    "fuck": "fuwk"
};


const wordSubstitutions = {
    "shit": "shoot",
    "this": "dis",
    "the": "da",
    "says": "sez",
    "has": "haz",
    "have": "haz",
    "happy": "happeh",
    "cat": "kitteh",
    "kitty": "kitteh",
    "oops": "oopsie woopsie",
    "eaten": "ated",
    "ate": "ated",
    "fuzzy": "fuzzy-wuzzy",
    "snake": "snek",
    "tasty": "yummy",
    "hungry": "hungy",
    "sigh": "huohh",
    "blanket": "blankie",
    "mom": "mommy",
    "dad": "daddy",
    "sleepy": "eepy",
    "cute": "cuwte",
    "cutely": "cuwtewy",
    "that": "dat",
    "that's": "dat's",
    "thats": "dats",
    "angry": "angy",
    "wtf": "wat the fuwk",
    "love": "wuv",
    "goodbye": "bai-bai",
    "thank you": "thamks",
    "excuse me": "pwease",
    "please": "pwease",
    "sorry": "sowwy",
    "okay": "owkay",
    "ok": "owkay",
    "yes": "yesh",
    "awesome": "awesomu",
    "fantastic": "fantastico",
    "beautiful": "beautifuw",
    "ugly": "uggwy",
    "stupid": "stoopid",
    "smart": "smort",
    "cool": "kewl",
    "with": "wif",
    "hello": "hewo",
    "hi": "hai",
    "bite": "nom",
    "bye": "bai",
    "your": "ur",
    "you": "chu",
    "thanks": "thx",
    "yeah": "yah",
    "are": "is",
    "doesnt": "doeswnt",
    "doesn't": "doeswn't",
    "dont": "doewnt",
    "don't": "doewn't",
    "bomb": "bom",
    "code": "cowde",
    "programmer": "pwogwammr",
    "funny": "silly"
};



function uwuIt(inpUwUt: string): string {

    const manyInputBlock: string[] = inpUwUt.split(" ");
    var finishedString: string = "";
    manyInputBlock.forEach((block: string) => {
        if (block.length <= settings.store.minimumWordLength) {
            // so just ignore it since its too short
            return;
        }

        if (block.includes("http") || block.includes(".com") || block.includes(".net") || block.includes(".org") || block.includes(".dev")) {
            // so since its *probably* a link lets just ignore it
            return;
        }

        block = block.toLowerCase();

        if (settings.store.replacements) {
            if (wordSubstitutions[block]) {
                block = wordSubstitutions[block];
            } else {
                // pardon me but what
                // https://stackoverflow.com/questions/34913675/how-to-iterate-keys-values-in-javascript
                for (const [key, value] of Object.entries(substitutions)) {
                    block = block.replaceAll(key, value);
                }
            }
        }

        finishedString += block + " ";
    });

    if (settings.store.enabledSuffixes) {
        finishedString += endings[randomInt(0, endings.length - 1)];
    }

    return finishedString;
}


export default definePlugin({
    name: "UwUify",
    description: "Adds a command (/uwuify) that makes your text more UwU",
    authors: [Devs.UnluckyCrafter, Devs.WackyModer],
    dependencies: ["CommandsAPI"],
    settings,
    commands: [
        {
            name: "uwuify",
            description: "Makes your messages more silly and cute",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: uwuIt(findOption(opts, "message", ""))
            }),
        },
    ]
});

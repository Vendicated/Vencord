/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreSendListener, removePreSendListener, SendListener, } from "@api/MessageEvents";
import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const presendObject: SendListener = (channelId, msg) => {
    msg.content = textProcessing(msg.content);
};

export default definePlugin({
    name: "Grammar",
    description: "Adds apostrophes to words and capitalises new words",
    authors: [
        Devs.Samwich
    ],
    dependencies: ["MessageEventsAPI"],
    start() {
        addPreSendListener(presendObject);
    },
    stop() {
        removePreSendListener(presendObject);
    },
    options: {
        blockedWords: {
            type: OptionType.STRING,
            description: "Words that will not be capitalised",
            default: ""
        }
    }
});

function textProcessing(input: string) {
    const text = input;
    const captext = cap(text);
    const aptext = apostrophe(captext);
    return aptext;
}

function apostrophe(textInput: string): string {
    const corrected = "wasn't, can't, don't, won't, isn't, aren't, haven't, hasn't, hadn't, doesn't, didn't, shouldn't, wouldn't, couldn't, i'm, you're, he's, she's, it's, they're, that's, who's, what's, there's, here's, how's, where's, when's, why's, let's, you'll, I'll, they'll, it'll, I've, you've, we've, they've, you'd, he'd, she'd, it'd, we'd, they'd".toLowerCase();
    const words: string[] = corrected.split(", ");
    const wordsInputted = textInput.split(" ");

    wordsInputted.forEach(element => {
        words.forEach(wordelement => {
            if (removeApostrophes(wordelement) === element.toLowerCase()) {
                wordsInputted[wordsInputted.indexOf(element)] = restoreCap(wordelement, getCapData(element));
            }
        });
    });
    return wordsInputted.join(" ");
}

function getCapData(str: string) {
    const booleanArray: boolean[] = [];
    for (const char of str) {
        booleanArray.push(char === char.toUpperCase());
    }
    return booleanArray;

}

function removeApostrophes(str: string): string {
    return str.replace(/'/g, "");
}

function restoreCap(str: string, data: boolean[]): string {
    let resultString = "";
    let dataIndex = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (!char.match(/[a-zA-Z]/)) {
            resultString += char;
            continue;
        }

        const isUppercase = data[dataIndex++];
        resultString += isUppercase ? char.toUpperCase() : char.toLowerCase();
    }

    return resultString;
}

function cap(textInput: string): string {

    const sentences = textInput.split(/(?<=\w\.)\s/);

    const blockedWordsArray: string[] = Settings.plugins.Grammar.blockedWords.split(", ");

    return sentences.map(element => {

        if (!blockedWordsArray.some(word => element.toLowerCase().startsWith(word.toLowerCase()))) {
            return element.charAt(0).toUpperCase() + element.slice(1);
        }
        else {
            return element;
        }

    }).join(" ");
}


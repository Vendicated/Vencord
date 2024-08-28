/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings(
    {
        targetLanguage: {
            type: OptionType.STRING,
            description: "The language messages should be translated to",
            default: "en",
            restartNeeded: true
        },
        confidenceRequirement: {
            type: OptionType.STRING,
            description: "The confidence required to translated the message. Best not to edit unless you know what you're doing",
            default: "0.8",
            restartNeeded: true
        },
    });

async function translateAPI(sourceLang: string, targetLang: string, text: string): Promise<any> {

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&dj=1&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to translate "${text}" from ${sourceLang} to ${targetLang}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

async function TranslateMessage(string) {
    // there may be a better way to do this lmao
    if (string.includes("(Translated)")) return string;

    const response = await translateAPI("auto", settings.store.targetLanguage, string);

    if (response.src === settings.store.targetLanguage || response.confidence < settings.store.confidenceRequirement) return string;

    const { sentences }: { sentences: { trans?: string; }[]; } = await response;
    const translatedText = sentences.map(s => s?.trans).filter(Boolean).join("");

    return `${translatedText} *(Translated)*`;
}

export default definePlugin({
    name: "MessageTranslate",
    description: "Auto translate messages to your language",
    authors: [Devs.Samwich],
    settings,
    TranslateMessage: TranslateMessage,
    patches: [
        {
            find: ".messageListItem",
            replacement: {
                match: /renderContentOnly:\i}=\i;/,
                replace: "$&$self.TranslateMessage(arguments[0].message.content).then(response => arguments[0].message.content = response);"
            }
        },
    ]
});

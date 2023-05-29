/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { addButton, removeButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, FluxDispatcher, MessageStore } from "@webpack/common";

const languages = {
    iso: ["auto", "am", "ar", "ay", "as", "ak", "az", "be", "bg", "bm", "bn", "co", "cs", "bs", "da", "ca", "ca", "de", "ee", "dv", "dv", "dv", "en", "el", "et", "eo", "eu", "es", "es", "fi", "fr", "fa", "ga", "gl", "gn", "fy", "gu", "gd", "gd", "ha", "hr", "he", "hi", "ht", "ht", "hy", "id", "hu", "ig", "is", "it", "ka", "jv", "ja", "ko", "kk", "kn", "af", "km", "cy", "ku", "ky", "ky", "la", "lb", "lb", "lg", "lo", "lv", "ln", "lt", "mg", "mk", "ml", "mi", "mr", "nb", "mn", "my", "mt", "ne", "ms", "nl", "nl", "ny", "ny", "ny", "no", "om", "or", "pa", "pa", "pl", "qu", "ps", "ps", "ru", "sa", "ro", "ro", "ro", "sl", "rw", "sk", "si", "si", "sm", "sn", "so", "sr", "sq", "sw", "st", "sv", "su", "ta", "tg", "te", "tl", "tk", "ti", "th", "ts", "sd", "pt", "tw", "tr", "tt", "ur", "uk", "ug", "ug", "uz", "vi", "yi", "xh", "zh-tw", "zh-cn", "zu", "yo"],
    iso2: ["auto", "amh", "ara", "aym", "asm", "aka", "aze", "bel", "bul", "bam", "ben", "cos", "cze", "bos", "dan", "cat", "cat", "ger", "ewe", "div", "div", "div", "eng", "gre", "est", "epo", "baq", "spa", "spa", "fin", "fre", "per", "gle", "glg", "grn", "fry", "guj", "gla", "gla", "hau", "hrv", "heb", "hin", "hat", "hat", "arm", "ind", "hun", "ibo", "ice", "ita", "geo", "jav", "jpn", "kor", "kaz", "kan", "afr", "khm", "wel", "kur", "kir", "kir", "lat", "ltz", "ltz", "lug", "lao", "lav", "lin", "lit", "mlg", "mac", "mal", "mao", "mar", "nob", "mon", "bur", "mlt", "nep", "may", "dut", "dut", "nya", "nya", "nya", "nor", "orm", "ori", "pan", "pan", "pol", "que", "pus", "pus", "rus", "san", "rum", "rum", "rum", "slv", "kin", "slo", "sin", "sin", "smo", "sna", "som", "srp", "alb", "swa", "sot", "swe", "sun", "tam", "tgk", "tel", "tgl", "tuk", "tir", "tha", "tso", "snd", "por", "twi", "tur", "tat", "urd", "ukr", "uig", "uig", "uzb", "vie", "yid", "xho", "chit", "chis", "zul", "yor"],
    names: ["detect", "amharic", "arabic", "aymara", "assamese", "akan", "azerbaijani", "belarusian", "bulgarian", "bambara", "bengali", "corsican", "czech", "bosnian", "danish", "catalan", "valencian", "german", "ewe", "divehi", "dhivehi", "maldivian", "english", "greek", "estonian", "esperanto", "basque", "spanish", "castilian", "finnish", "french", "persian", "irish", "galician", "guarani", "western_frisian", "gujarati", "gaelic", "scottish_gaelic", "hausa", "croatian", "hebrew", "hindi", "haitian", "haitian_creole", "armenian", "indonesian", "hungarian", "igbo", "icelandic", "italian", "georgian", "javanese", "japanese", "korean", "kazakh", "kannada", "afrikaans", "central_khmer", "welsh", "kurdish", "kirghiz", "kyrgyz", "latin", "luxembourgish", "letzeburgesch", "ganda", "lao", "latvian", "lingala", "lithuanian", "malagasy", "macedonian", "malayalam", "maori", "marathi", "norwegian_bokmål", "mongolian", "burmese", "maltese", "nepali", "malay", "dutch", "flemish", "chichewa", "chewa", "nyanja", "norwegian", "oromo", "oriya", "panjabi", "punjabi", "polish", "quechua", "pushto", "pashto", "russian", "sanskrit", "romanian", "moldavian", "moldovan", "slovenian", "kinyarwanda", "slovak", "sinhala", "sinhalese", "samoan", "shona", "somali", "serbian", "albanian", "swahili", "southern_sotho", "swedish", "sundanese", "tamil", "tajik", "telugu", "tagalog", "turkmen", "tigrinya", "thai", "tsonga", "sindhi", "portuguese", "twi", "turkish", "tatar", "urdu", "ukrainian", "uighur", "uyghur", "uzbek", "vietnamese", "yiddish", "xhosa", "chinese_traditional", "chinese_simplified", "zulu", "yoruba"]
        .map(l => l.replace("_", " ").split(" ").map(w => w.at(0)?.toLocaleUpperCase() + w.slice(1)).join())
};

const icons = {
    revert: () => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="48" viewBox="0 -960 960 960" width="48"><path d="M451-122q-123-10-207-101t-84-216q0-77 35.5-145T295-695l43 43q-56 33-87 90.5T220-439q0 100 66 173t165 84v60Zm60 0v-60q100-12 165-84.5T741-439q0-109-75.5-184.5T481-699h-20l60 60-43 43-133-133 133-133 43 43-60 60h20q134 0 227 93.5T801-439q0 125-83.5 216T511-122Z" /></svg>),
    translate: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="48" viewBox="0 -960 960 960" width="48"><path d="m481-80-41-120H160q-35 0-57.5-22.5T80-280v-520q0-35 22.5-57.5T160-880h240l35 119.4h365q35 0 57.5 22.387Q880-715.825 880-681v521q0 35-22.444 57.5T800.2-80H481ZM286.701-376Q356-376 400-420.778T444-537v-15.5q0-6.5-2.013-11.5H283v61h90q-8 28.949-30.5 44.975Q320-442 288-442q-39 0-67-28.289-28-28.288-28-69.711t28-69.711Q249-638 287.742-638q17.881 0 33.775 6.5 15.894 6.5 28.807 19.5L399-658q-20-22-50-34t-62-12q-68 0-115.5 48T124-540q0 68 47.706 116 47.705 48 114.995 48Zm267.704 19L577-378q-14-17-26-32.5T528-444l26.405 87Zm49.79-51q28.363-33 43.052-63 14.688-30 19.753-47H508l11 43h40q8 14.7 19 31.85Q589-426 604.195-408ZM521-120h279q17 0 28.5-11.521 11.5-11.52 11.5-28.55V-681q0-17-11.5-28.5T800-721H448l46 163h79v-43h41v43h147v40h-52q-9 38-29 74.151-20 36.15-47 67.28l109 107.448L713-240 604-348l-36 36 33 112-80 80Z" /></svg>)
};

const settings = definePluginSettings({
    toLanguage: {
        type: OptionType.SELECT,
        description: "The language to translate the text into.",
        options: languages.iso.slice(1).map((iso, idx) => ({
            label: languages.names[idx],
            value: iso,
            default: iso === "en"
        }))
    }
});

const translate = async (from: string, to: string, text: string) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const json = await res.json();
    const fromLanguage = json && json[2] && languages.names[
        json[2].length === 2 ?
            languages.iso.findIndex(l => l === json[2]) :
            languages.iso2.findIndex(l => l === json[2])
    ];
    const translatedText = json && json[0] && json[0][0] && json[0].map(s => s[0]).join("");
    if (!(fromLanguage && translatedText)) throw new Error("Invalid translation!");
    const toLanguage = languages.names[languages.iso.findIndex(l => l === settings.store.toLanguage)];
    return { fromLanguage, toLanguage, translatedText };
};

let cache: { [msgId: string]: string; }[] = [];

export default definePlugin({
    name: "Translate Messages",
    description: "Translate your messages using Google Translate.",
    authors: [Devs.Shrihan],
    settings,
    start() {
        addButton("translate", msg => {
            const cachedMsg = cache.find(o => Object.hasOwn(o, msg.id));
            const message = MessageStore.getMessage(msg.channel_id, msg.id);
            return {
                label: cachedMsg ? "Revert" : "Translate",
                icon: cachedMsg ? icons.revert : icons.translate,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => {
                    const translateResult = await translate("auto", settings.store.toLanguage, message.content);
                    FluxDispatcher.dispatch({
                        type: "MESSAGE_UPDATE",
                        message: {
                            ...message,
                            content: `${cachedMsg ? cachedMsg[message.id] : translateResult.translatedText}`
                                + `${cachedMsg ? "" : `\t\`[${translateResult.fromLanguage} -> ${translateResult.toLanguage}]\``}`,
                        }
                    });
                    cachedMsg
                        ? cache = cache.filter(o => o !== cachedMsg)
                        : cache.unshift({ [message.id]: message.content });
                }
            };
        });
    },
    stop() {
        removeButton("translate");
    }
});

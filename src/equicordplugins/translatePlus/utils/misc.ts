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

import { classNameFactory } from "@api/Styles";

import { settings } from "../settings";

export const cl = classNameFactory("vc-trans-");

interface TranslationData {
    src: string;
    sentences: {
        // 🏳️‍⚧️
        trans: string;
    }[];
}

export interface TranslationValue {
    src: string;
    text: string;
}

const dictonary = /\b(?:leko|weka|pan|lete|linja|lipu|suli|nimi|akesi|misikeke|selo|ike|sijelo|sona|lili|pimeja|ante|jo|loje|telo|walo|kijetesantakalu|kasi|waso|wile|utala|lukin|sina|lape|ma|pilin|jasima|la|olin|pipi|meso|lawa|pi|pakala|oko|tan|ken|jaki|unpa|esun|seme|sitelen|len|kule|soko|open|ala|tenpo|lon|sinpin|pini|kokosila|mama|musi|monsi|mewika|taso|ona|mun|kiwen|tomo|mute|mi|nena|palisa|meli|laso|wawa|ale|kipisi|kulupu|ilo|lupa|nanpa|en|mu|jelo|kili|tonsi|moku|ni|kama|pu|poki|monsuta|sin|lasina|poka|soweli|sewi|elena|epiku|moli|pona|lanpan|alasa|anu|kute|uta|luka|suno|sama|awen|namako|suwi|noka|seli|mije|sike|jan|pali|tawa|inli|nasa|mani|wan|insa|nijon|nasin|kalama|ijo|toki|anpa|kala|kepeken|ko|kon|pana|tu|supa|kin|usawi|yupekosi)\b/gm;

function isTokiPona(string) {
    const words = string.split(/\s+/);

    const matches = string.match(dictonary) || [];

    const percentage = (matches.length / words.length) * 100;

    return percentage >= 50;
}

export async function translate(kind: "received" | "sent", text: string): Promise<TranslationValue> {
    let output;

    if (isTokiPona(text)) {
        const [api, auth] = [settings.store.tokiPonaAPI, settings.store.tokiPonaAuth];

        const translate = await (await fetch(api, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Basic ${auth}`
            },
            body: JSON.stringify({
                text: text,
                src: "tl",
                target: "en"
            })
        })).json();

        output = {
            src: "tp",
            text: translate.translation[0]
        };
    } else {
        const [sourceLang, targetLang] = [settings.store[kind + "Input"], settings.store[kind + "Output"]];

        const translate = await (await fetch(`https://translate.googleapis.com/translate_a/single?${new URLSearchParams({ client: "gtx", sl: sourceLang, tl: targetLang, dt: "t", dj: "1", source: "input", q: text })}`)).json();

        output = {
            src: translate.src,
            text: translate.sentences.map(s => s.trans).filter(Boolean).join("")
        };
    }

    return output;
}

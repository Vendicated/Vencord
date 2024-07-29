/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "../settings";

function isTokiPona(text: string) {
    const dictionary = /\b(?:leko|weka|pan|lete|linja|lipu|suli|nimi|akesi|misikeke|selo|ike|sijelo|sona|lili|pimeja|ante|jo|loje|telo|walo|kijetesantakalu|kasi|waso|wile|utala|lukin|sina|lape|ma|pilin|jasima|la|olin|pipi|meso|lawa|pi|pakala|oko|tan|ken|jaki|unpa|esun|seme|sitelen|len|kule|soko|open|ala|tenpo|lon|sinpin|pini|kokosila|mama|musi|monsi|mewika|taso|ona|mun|kiwen|tomo|mute|mi|nena|palisa|meli|laso|wawa|ale|kipisi|kulupu|ilo|lupa|nanpa|en|mu|jelo|kili|tonsi|moku|ni|kama|pu|poki|monsuta|sin|lasina|poka|soweli|sewi|elena|epiku|moli|pona|lanpan|alasa|anu|kute|uta|luka|suno|sama|awen|namako|suwi|noka|seli|mije|sike|jan|pali|tawa|inli|nasa|mani|wan|insa|nijon|nasin|kalama|ijo|toki|anpa|kala|kepeken|ko|kon|pana|tu|supa|kin|usawi|yupekosi)\b/gm;

    return (text.match(dictionary) || []).length >= text.split(/\s+/).length * 0.5;
}

function isSitelen(text: string) {
    const dictionary = /(?:󱤀|󱤁|󱤂|󱤃|󱤄|󱤅|󱤆|󱤇|󱤈|󱤉|󱤊|󱤋|󱤌|󱤍|󱤎|󱤏|󱤐|󱤑|󱤒|󱤓|󱤔|󱤕|󱤖|󱤗|󱤘|󱤙|󱤚|󱤛|󱤜|󱤝|󱤞|󱤟|󱤠|󱤡|󱤢|󱤣|󱤤|󱤥|󱤦|󱤧|󱤨|󱤩|󱤪|󱤫|󱤬|󱤭|󱤮|󱤯|󱤰|󱤱|󱤲|󱤳|󱤴|󱤵|󱤶|󱤷|󱤸|󱤹|󱤺|󱤻|󱤼|󱤽|󱤾|󱤿|󱥀|󱥁|󱥂|󱥃|󱥄|󱥅|󱥆|󱥇|󱥈|󱥉|󱥊|󱥋|󱥌|󱥍|󱥎|󱥏|󱥐|󱥑|󱥒|󱥓|󱥔|󱥕|󱥖|󱥗|󱥘|󱥙|󱥚|󱥛|󱥜|󱥝|󱥞|󱥟|󱥠|󱥡|󱥢|󱥣|󱥤|󱥥|󱥦|󱥧|󱥨|󱥩|󱥪|󱥫|󱥬|󱥭|󱥮|󱥯|󱥰|󱥱|󱥲|󱥳|󱥴|󱥵|󱥶|󱥷|󱦠|󱦡|󱦢|󱦣|󱥸|󱥹|󱥺|󱥻|󱥼|󱥽|󱥾|󱥿|󱦀|󱦁|󱦂|󱦃|󱦄|󱦅|󱦆|󱦇|󱦈|󱦐|󱦑|󱦒|󱦓|󱦔|󱦕|󱦖|󱦗|󱦘|󱦙|󱦚|󱦛|󱦜|󱦝)/gm;

    return dictionary.test(text);
}

function isShavian(text: string) {
    const shavianRegex = /[\u{10450}-\u{1047F}]+/u;

    return shavianRegex.test(text);
}

async function translateShavian(message: string) {
    const dictionary = await (await fetch("https://raw.githubusercontent.com/ForkPrince/TranslatePlus/322199d5fdb1a9506591c9f4a2826338b5d67e38/shavian.json")).json();

    const punctuationMap = {
        '"': "\"",
        "«": "\"",
        "»": "\"",
        ",": ",",
        "!": "!",
        "?": "?",
        ".": ".",
        "(": "(",
        ")": ")",
        "/": "/",
        ";": ";",
        ":": ":"
    };

    let translated = "";
    const words = message.split(/\s+/);

    for (let word of words) {
        let punctuationBefore = "", punctuationAfter = "";

        if (word[0] in punctuationMap) {
            punctuationBefore = punctuationMap[word[0]];
            word = word.slice(1);
        }

        if (word[word.length - 1] in punctuationMap) {
            punctuationAfter = punctuationMap[word[word.length - 1]];
            word = word.slice(0, -1);
        }

        translated += punctuationBefore;

        if (word in dictionary) translated += dictionary[word];
        else translated += word;

        translated += punctuationAfter + " ";
    }

    return translated.trim();
}

async function translateSitelen(message: string) {
    message = Array.from(message).join(" ");

    const dictionary = await (await fetch("https://raw.githubusercontent.com/ForkPrince/TranslatePlus/5ca152b134ea11433971f21b2ef8d556d4306717/sitelen-pona.json")).json();

    const sorted = Object.keys(dictionary).sort((a, b) => b.length - a.length);

    const pattern = new RegExp(`(${sorted.join("|")})`, "g");

    const translate = message.replace(pattern, match => dictionary[match]);

    return translate;
}

async function google(target: string, text: string) {
    const translate = await (await fetch(`https://translate.googleapis.com/translate_a/single?${new URLSearchParams({ client: "gtx", sl: "auto", tl: target, dt: "t", dj: "1", source: "input", q: text })}`)).json();

    return {
        src: translate.src,
        text: translate.sentences.map(s => s.trans).filter(Boolean).join("")
    };
}

export async function translate(text: string): Promise<any> {
    const { target, toki, sitelen, shavian } = settings.store;

    const output = { src: "", text: "" };

    if ((isTokiPona(text) || isSitelen(text)) && (toki || sitelen)) {
        if (isSitelen(text) && sitelen) text = await translateSitelen(text);

        console.log(text);

        const translate = await (await fetch("https://aiapi.serversmp.xyz/toki", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: text,
                src: "tl",
                target: "en"
            })
        })).json();

        console.log(translate);

        output.src = "tp";
        output.text = target === "en" ? translate.translation[0] : (await google(target, translate.translation[0])).text;
    } else if (isShavian(text) && shavian) {
        const translate = await translateShavian(text);

        output.src = "sh";
        output.text = target === "en" ? translate : (await google(target, translate)).text;
    } else {
        const translate = await google(target, text);

        output.src = translate.src;
        output.text = translate.text;
    }

    return output;
}

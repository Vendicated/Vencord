/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import { KEYWORD_KEY_STRING, setKeywordsList } from "./index";

export const ToneKeywords = {
    "/j": "Joking",
    "/hj": "Half Joking",
    "/s": "Sarcastic",
    "/_sarc": "Sarcastic", // Alias for s
    "/gen": "Genuine",
    "/_g": "Genuine", // Alias for gen,
    "/genq": "Genuine Question",
    "/_gq": "Genuine Question", // Alias for genq
    "/srs": "Serious",
    "/nsrs": "Non-Serious",
    "/pos": "Positive Connotation",
    "/_pc": "Positive Connotation", // Alias for pos
    "/neu": "Neutral Connotation",
    "/neg": "Negative Connotation",
    "/_nc": "Negative Connotation", // Alias for neg
    "/p:" : "Platonic",
    "/r:" : "Romantic",
    "/a:" : "Alterous",
    "/c:" : "Copypasta",
    "/l:" : "Lyrics",
    "/_ly": "Lyrics", // Alias for l
    "/lh": "Light-Hearted",
    "/nm": "Not Mad",
    "/lu": "A Little Upset",
    "/nbh": "Not Directed At Anybody Here",
    "/nay": "Not Directed At You",
    "/ay": "Directed At You",
    "/nsb": "Not Subtweeting",
    "/x:" :"Sexual Intent",
    "/_sx": "Sexual Intent", // Alias for x
    "/nx": "Non-Sexual Intent",
    "/_nsx": "Non-Sexual Intent", // Alias for nx
    "/rh": "Rhetorical Question",
    "/_rt": "Rhetorical Question", // Alias for rh
    "/t": "Teasing",
    "/ij": "Inside Joke",
    "/m": "Metaphorically",
    "/li": "Literally",
    "/hyp": "Hyperbole",
    "/ex": "Exaggeration",
    "/f": "Fake",
    "/q": "Quote",
    "/th": "Threat",
    "/cb": "Clickbait",
    "/ref": "Reference",
    "/nf": "Not Forced",
    "/nbr": "Not Being Rude",
    "/ot": "Off-Topic",
    "/nj": "Not Joking",
    "/naj": "Not A Joke",
};

export const GenericKeywords = {
    lol: "Laugh out loud",
    asap: "As soon as possible",
    fyi: "For your information",
    btw: "By the way",
    omg: "Oh my God",
    idk: "I don't know",
    imho: "In my humble opinion",
    ttyl: "Talk to you later",
    brb: "Be right back",
    tbh: "To be honest",
    smh: "Shaking my head",
    tmi: "Too much information",
    rofl: "Rolling on the floor laughing",
    gtg: "Got to go",
    afk: "Away from keyboard",
    irl: "In real life",
    afaik: "As far as I know",
    imo: "In my opinion",
    jk: "Just kidding",
    tgif: "Thank God it's Friday",
    lmao: "Laughing my ass off",
    nvm: "Never mind",
    icymi: "In case you missed it",
    eta: "Estimated time of arrival",
    rt: "Retweet",
    dm: "Direct message",
    fwiw: "For what it's worth",
    cba: "Can't be bothered",
    wya: "Where are you?"
}

interface Tone {
    abbreviation: string;
    tooltip: string;
}

export let CustomKeywords: { [key: string]: string; } = {};

export async function setKeywords(): Promise<void> {
    const tones = await DataStore.get(KEYWORD_KEY_STRING) as Tone[];
    const newTones: { [key: string]: string; } = {};

    for (const tone of tones) {
        if (tone.abbreviation && tone.tooltip) {
            const abbreviation = tone.abbreviation.replace("/", "");
            newTones[abbreviation] = tone.tooltip;
        }
    }

    CustomKeywords = newTones;
    setKeywordsList()
}

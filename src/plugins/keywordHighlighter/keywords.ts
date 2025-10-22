/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import { KEYWORD_KEY_STRING, setKeywordsList } from "./index";

export const ToneKeywords: Record<string, string> = {
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
} as const;

export const GenericKeywords: Record<string, string> = {
    lol: "Laugh out loud",
    lmao: "Laughing my ass off",
    rofl: "Rolling on the floor laughing",
    brb: "Be right back",
    gtg: "Got to go",
    afk: "Away from keyboard",
    omg: "Oh my God",
    idk: "I don't know",
    ikr: "I know, right?",
    btw: "By the way",
    tbh: "To be honest",
    smh: "Shaking my head",
    nvm: "Never mind",
    asap: "As soon as possible",
    imo: "In my opinion",
    imho: "In my humble opinion",
    fyi: "For your information",
    jk: "Just kidding",
    ttyl: "Talk to you later",
    yw: "You're welcome",
    np: "No problem",
    icymi: "In case you missed it",
    rn: "Right now",
    tfw: "That feeling when",
    cba: "Can't be bothered",
    wya: "Where are you?",
    dm: "Direct message",
    pm: "Private message",
    rt: "Retweet",
    tmi: "Too much information",
    irl: "In real life",
    afaik: "As far as I know",
    idc: "I don't care",
    fwiw: "For what it's worth",
    ftw: "For the win",
    smol: "Small and cute",
    oop: "Oops",
    bff: "Best friends forever",
    fam: "Close friend/family",
    sus: "Suspicious",
    ngl: "Not gonna lie",
    hmu: "Hit me up",
    bbl: "Be back later",
    bbs: "Be back soon",
    tldr: "Too long; didn't read",
} as const;

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
    setKeywordsList();
}

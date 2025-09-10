/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const defaultIndicators = new Map(
    Object.entries({
        j: "Joking",
        hj: "Half Joking",
        s: "Sarcastic",
        _sarc: "Sarcastic", // Alias for s
        gen: "Genuine",
        _g: "Genuine", // Alias for gen,
        genq: "Genuine Question",
        _gq: "Genuine Question", // Alias for genq
        srs: "Serious",
        nsrs: "Non-Serious",
        pos: "Positive Connotation",
        _pc: "Positive Connotation", // Alias for pos
        neu: "Neutral Connotation",
        neg: "Negative Connotation",
        _nc: "Negative Connotation", // Alias for neg
        p: "Platonic",
        r: "Romantic",
        a: "Alterous",
        c: "Copypasta",
        l: "Lyrics",
        _ly: "Lyrics", // Alias for l
        lh: "Light-Hearted",
        nm: "Not Mad",
        lu: "A Little Upset",
        nbh: "Not Directed At Anybody Here",
        nay: "Not Directed At You",
        ay: "Directed At You",
        nsb: "Not Subtweeting",
        x: "Sexual Intent",
        _sx: "Sexual Intent", // Alias for x
        nx: "Non-Sexual Intent",
        _nsx: "Non-Sexual Intent", // Alias for nx
        rh: "Rhetorical Question",
        _rt: "Rhetorical Question", // Alias for rh
        t: "Teasing",
        ij: "Inside Joke",
        m: "Metaphorically",
        li: "Literally",
        hyp: "Hyperbole",
        ex: "Exaggeration",
        f: "Fake",
        q: "Quote",
        th: "Threat",
        cb: "Clickbait",
        ref: "Reference",
        nf: "Not Forced",
        nbr: "Not Being Rude",
        ot: "Off-Topic",
        nj: "Not Joking",
        naj: "Not A Joke",
    }),
);

export default defaultIndicators;

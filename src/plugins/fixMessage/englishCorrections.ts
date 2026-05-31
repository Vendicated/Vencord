/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * English local corrections — spelling, contractions, and basic
 * punctuation for casual English chat.
 *
 * This is experimental. More languages coming soon.
 */

// Common English typos and misspellings
const EN_SPELLING: Record<string, string> = {
    "teh": "the",
    "recieve": "receive",
    "beleive": "believe",
    "definately": "definitely",
    "definatly": "definitely",
    "occured": "occurred",
    "occurance": "occurrence",
    "acommodate": "accommodate",
    "neccessary": "necessary",
    "necesary": "necessary",
    "seperate": "separate",
    "calender": "calendar",
    "wich": "which",
    "untill": "until",
    "thier": "their",
    "tommorow": "tomorrow",
    "tommorrow": "tomorrow",
    "alot": "a lot",
    "foward": "forward",
    "sincerly": "sincerely",
    "adress": "address",
    "becuase": "because",
    "becuz": "because",
    "cuz": "because",
    "tho": "though",
    "thru": "through",
    "thx": "thanks",
    "pls": "please",
    "plz": "please",
    "welp": "well",
};

// Missing apostrophes in contractions
const EN_CONTRACTIONS: Record<string, string> = {
    "dont": "don't",
    "cant": "can't",
    "wont": "won't",
    "didnt": "didn't",
    "doesnt": "doesn't",
    "wasnt": "wasn't",
    "werent": "weren't",
    "hadnt": "hadn't",
    "hasnt": "hasn't",
    "havent": "haven't",
    "isnt": "isn't",
    "arent": "aren't",
    "couldnt": "couldn't",
    "wouldnt": "wouldn't",
    "shouldnt": "shouldn't",
    "mustnt": "mustn't",
    "neednt": "needn't",
    "shant": "shan't",
    "youre": "you're",
    "theyre": "they're",
    "im": "I'm",
    "ive": "I've",
    "id": "I'd",
    "ill": "I'll",
    "thats": "that's",
    "whats": "what's",
    "whos": "who's",
    "wheres": "where's",
    "whens": "when's",
    "hows": "how's",
    "lets": "let's",
    "theyll": "they'll",
};

// Internet shorthand (only unambiguous ones)
const EN_ABBREV: Record<string, string> = {
    "idk": "I don't know",
    "btw": "by the way",
    "tbh": "to be honest",
    "afaik": "as far as I know",
    "imo": "in my opinion",
    "imho": "in my humble opinion",
    "brb": "be right back",
    "gtg": "got to go",
    "g2g": "got to go",
    "omw": "on my way",
    "np": "no problem",
    "ty": "thank you",
    "yw": "you're welcome",
    "nvm": "never mind",
    "wip": "work in progress",
};

// Sentence breakers for English
const EN_BREAKERS = /(?<=\b(?:ok|okay|cool|nice|great|awesome|right|sure|alright|got it|i see|makes sense|no problem|you bet|deal|fair enough)\b)\s+(?=[A-Za-z])/i;

function enSplitSentences(text: string): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [text];

    const byPunct = trimmed.split(/(?<=[.!?…])\s+/);
    if (byPunct.length > 1) return byPunct;

    const byBreaker = trimmed.split(EN_BREAKERS);
    if (byBreaker.length > 1) return byBreaker;

    return [trimmed];
}

function enClassify(text: string): "statement" | "question" | "exclamation" {
    const trimmed = text.trim();
    if (!trimmed) return "statement";
    const lower = trimmed.toLowerCase();

    // Tag questions — common in English
    if (/,\s*(right|ok|okay|yeah|no|huh|eh|you know|see|innit|mate)\s*$/i.test(trimmed)) {
        return "question";
    }

    // Question words at start
    if (/^(what\b|why\b|when\b|where\b|who\b|whose\b|whom\b|which\b|how\b|how\s+(come|about|many|much|long|far|often|old))\s/i.test(trimmed)) {
        return "question";
    }

    // Do/does/did + subject = question
    if (/^(do|does|did|is|are|was|were|has|have|had|can|could|will|would|shall|should|may|might)\s+\w+/i.test(trimmed)) {
        const words = trimmed.split(/\s+/).length;
        if (words <= 6) return "question";
    }

    // Standalone question phrases
    if (/^(really|seriously|for real|no way|you sure|are you|r u|u sure|why|how come|what for|say what)$/i.test(lower)) {
        return "question";
    }

    // Interjections = exclamation
    if (/^(wow|oh|ah|hey|yo|whoa|ouch|ow|eek|yikes|jeez|gosh|omg|oh my god|holy|damn|shit|fuck|crap|darn|geez|man|bro|dude|guys)\b/i.test(trimmed)) {
        return "exclamation";
    }

    // "what a / such a + noun" exclamation
    if (/^(what a|such a)\s+\w+/i.test(trimmed)) {
        return "exclamation";
    }

    // Short intense phrases
    const wc = trimmed.split(/\s+/).length;
    if (wc <= 5 && /(awesome|amazing|fantastic|incredible|beautiful|gorgeous|perfect|excellent|wonderful|terrific|splendid|fabulous|lovely|great|nice|cool|sick|dope|fire|lit|no way|you kidding|holy shit|holy cow|for real|no kidding|i know right|tell me about it|ikr|same|fr|ong|no cap)$/i.test(trimmed)) {
        return "exclamation";
    }

    return "statement";
}

function enPunctuate(text: string): string {
    const trimmed = text.trim().replace(/[.!?…\s]+$/, "");
    if (!trimmed) return text;

    const type = enClassify(trimmed);
    switch (type) {
        case "question": return trimmed + "?";
        case "exclamation": return trimmed + "!";
        default: return trimmed + ".";
    }
}

const SENTENCE_END = /[.!?…]+$/;

function enEnding(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return text;

    const sentences = enSplitSentences(trimmed);
    const processed = sentences.map(s => {
        const st = s.trim();
        if (!st) return s;
        if (SENTENCE_END.test(st)) return st;
        return enPunctuate(st);
    });

    return processed.join(" ");
}

// ─── MAIN ───

export function applyEnglishCorrections(text: string): string {
    if (!text || text.length < 2) return text;

    let result = text;

    // Fix "i" → "I" (capitalize standalone "i")
    result = result.replace(/\bi\b/g, "I");

    // Walk through words
    const tokens = result.split(/(\s+)/);
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (/^\s*$/.test(t)) continue;

        const lower = t.toLowerCase();

        // Try abbreviations (multi-word, so we replace the token)
        if (EN_ABBREV[lower]) {
            // Preserve surrounding punctuation
            const punctPre = t.match(/^\W+/)?.[0] || "";
            const punctSuf = t.match(/\W+$/)?.[0] || "";
            tokens[i] = punctPre + EN_ABBREV[lower] + punctSuf;
            continue;
        }

        // Strip punctuation for dictionary lookup
        const clean = t.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "").toLowerCase();
        if (!clean) continue;

        // Try contractions
        if (EN_CONTRACTIONS[clean]) {
            const match = t.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9]+)([^a-zA-Z0-9]*)$/);
            if (match) {
                tokens[i] = match[1] + EN_CONTRACTIONS[clean] + match[3];
                continue;
            }
        }

        // Try spelling
        if (EN_SPELLING[clean] && EN_SPELLING[clean] !== clean) {
            const match = t.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9]+)([^a-zA-Z0-9]*)$/);
            if (match) {
                const replacement = EN_SPELLING[clean];
                // Preserve capitalisation
                const isCap = clean[0] === clean[0].toUpperCase() && clean.length > 0;
                const finalWord = isCap
                    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
                    : replacement;
                tokens[i] = match[1] + finalWord + match[3];
                continue;
            }
        }

        // "u" → "you" (only lowercase standalone, not part of a word)
        if (t === "u" || t === "U") {
            tokens[i] = "you";
            continue;
        }
        if (t === "r" || t === "R") {
            tokens[i] = "are";
            continue;
        }
    }

    result = tokens.join("");

    // Basic punctuation
    result = enEnding(result);

    // Capitalise first letter and after sentence breaks
    if (result.length > 0) {
        const first = result.charAt(0);
        const upper = first.toLocaleUpperCase("en-US");
        if (first !== upper) {
            result = upper + result.slice(1);
        }
        result = result.replace(
            /([.!?])\s+(.)/g,
            (_, p, c) => p + " " + c.toLocaleUpperCase("en-US")
        );
    }

    return result;
}

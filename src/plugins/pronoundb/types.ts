export interface PronounsResponse {
    [id: string]: PronounCode;
}

export type PronounCode = keyof typeof PronounMapping;

export const PronounMapping = {
    hh: {
        lowercase: "he/him",
        capitalized: "He/Him"
    },
    hi: {
        lowercase: "he/it",
        capitalized: "He/It"
    },
    hs: {
        lowercase: "he/she",
        capitalized: "He/She"
    },
    ht: {
        lowercase: "he/they",
        capitalized: "He/They"
    },
    ih: {
        lowercase: "it/him",
        capitalized: "It/Him"
    },
    ii: {
        lowercase: "it/its",
        capitalized: "It/Its"
    },
    is: {
        lowercase: "it/she",
        capitalized: "It/She"
    },
    it: {
        lowercase: "it/they",
        capitalized: "It/They"
    },
    shh: {
        lowercase: "she/he",
        capitalized: "She/He"
    },
    sh: {
        lowercase: "she/her",
        capitalized: "She/Her"
    },
    si: {
        lowercase: "she/it",
        capitalized: "She/It"
    },
    st: {
        lowercase: "she/they",
        capitalized: "She/They"
    },
    th: {
        lowercase: "they/he",
        capitalized: "They/He"
    },
    ti: {
        lowercase: "they/it",
        capitalized: "They/It"
    },
    ts: {
        lowercase: "they/she",
        capitalized: "They/She"
    },
    tt: {
        lowercase: "they/them",
        capitalized: "They/Them"
    },
    any: {
        lowercase: "Any pronouns",
        capitalized: "Any pronouns"
    },
    other: {
        lowercase: "Other pronouns",
        capitalized: "Other pronouns"
    },
    ask: {
        lowercase: "Ask me my pronouns",
        capitalized: "Ask me my pronouns"
    },
    avoid: {
        lowercase: "Avoid pronouns, use my name",
        capitalized: "Avoid pronouns, use my name"
    },
    unspecified: {
        lowercase: "Unspecified",
        capitalized: "Unspecified"
    },
} as const;

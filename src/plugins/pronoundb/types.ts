// Not the full props, only what is necessary for pronoundb plugin to work
export interface MessageHeaderProps {
    message: {
        author: {
            id: string;
            bot: boolean;
            system: boolean;
        },
    };
}

export interface PronounsResponse {
    [id: string]: PronounCode;
}

export type PronounCode = keyof typeof PronounMapping;

export const PronounMapping = {
    unspecified: "Unspecified",
    hh: "He/Him",
    hi: "He/It",
    hs: "He/She",
    ht: "He/They",
    ih: "It/Him",
    ii: "It/Its",
    is: "It/She",
    it: "It/They",
    shh: "She/He",
    sh: "She/Her",
    si: "She/It",
    st: "She/They",
    th: "They/He",
    ti: "They/It",
    ts: "They/She",
    tt: "They/Them",
    any: "Any pronouns",
    other: "Other pronouns",
    ask: "Ask me my pronouns",
    avoid: "Avoid pronouns, use my name"
} as const;

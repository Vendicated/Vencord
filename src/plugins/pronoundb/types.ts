import { User } from "discord-types/general";

export interface UserProfileProps {
    customStatus: JSX.Element,
    displayProfile: {
        // In the future (if discord ever uses their pronouns system) this taking priority can be a plugin setting
        pronouns: string;
    };
    user: User;
}

export interface PronounsResponse {
    [id: string]: PronounCode;
}

export type PronounCode = keyof typeof PronounMapping;

export const PronounMapping = {
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
    avoid: "Avoid pronouns, use my name",
    unspecified: "Unspecified"
} as const;

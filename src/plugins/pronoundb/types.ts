/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

export interface UserProfileProps {
    userId: string;
}

export interface UserProfilePronounsProps {
    currentPronouns: string | null;
    hidePersonalInformation: boolean;
}

export interface PronounsResponse {
    [id: string]: {
        sets?: {
            [locale: string]: PronounCode[];
        }
    }
}

export interface CachePronouns {
    sets?: {
        [locale: string]: PronounCode[];
    }
}

export type PronounCode = keyof typeof PronounMapping;

export const PronounMapping = {
    he: "He/Him",
    it: "It/Its",
    she: "She/Her",
    they: "They/Them",
    any: "Any pronouns",
    other: "Other pronouns",
    ask: "Ask me my pronouns",
    avoid: "Avoid pronouns, use my name",
    unspecified: "No pronouns specified.",
} as const;

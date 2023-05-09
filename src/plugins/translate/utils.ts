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

import { Language } from "./languages";

export const cl = classNameFactory("vc-trans-");

interface TranslationData {
    sentences: {
        // 🏳️‍⚧️
        trans: string;
    }[];
}

export async function translate(inputLang: Language, outputLang: Language, text: string) {
    const url = "https://translate.googleapis.com/translate_a/single?" + new URLSearchParams({
        client: "gtx",
        sl: inputLang,
        tl: outputLang,
        dt: "t",
        dj: "1",
        source: "input",
        q: text
    });

    const res = await fetch(url);
    if (!res.ok)
        throw new Error(
            `Failed to translate "${text}" (${inputLang} -> ${outputLang}`
            + `\n${res.status} ${res.statusText}`
        );

    const data: TranslationData = await res.json();

    return data.sentences
        .map(s => s?.trans)
        .filter(Boolean)
        .join("");
}

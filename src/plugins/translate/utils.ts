/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";

import { settings } from "./settings";

export const cl = classNameFactory("vc-trans-");

interface TranslationData {
    src: string;
    sentences: {
        // 🏳️‍⚧️
        trans: string;
    }[];
}

export interface TranslationValue {
    src: string;
    text: string;
}

export async function translate(kind: "received" | "sent", text: string): Promise<TranslationValue> {
    const sourceLang = settings.store[kind + "Input"];
    const targetLang = settings.store[kind + "Output"];

    const url = "https://translate.googleapis.com/translate_a/single?" + new URLSearchParams({
        // see https://stackoverflow.com/a/29537590 for more params
        // holy shidd nvidia
        client: "gtx",
        // source language
        sl: sourceLang,
        // target language
        tl: targetLang,
        // what to return, t = translation probably
        dt: "t",
        // Send json object response instead of weird array
        dj: "1",
        source: "input",
        // query, duh
        q: text
    });

    const res = await fetch(url);
    if (!res.ok)
        throw new Error(
            `Failed to translate "${text}" (${sourceLang} -> ${targetLang})`
            + `\n${res.status} ${res.statusText}`
        );

    const { src, sentences }: TranslationData = await res.json();

    return {
        src,
        text: sentences.
            map(s => s?.trans).
            filter(Boolean).
            join("")
    };
}

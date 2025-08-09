/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import settings from "../../../..";
import { LyricsData, Provider, SyncedLyric } from "../types";

// stolen from src\plugins\translate\utils.ts

interface GoogleData {
    src: string;
    sentences: {
        // 🏳️‍⚧️
        trans: string;
        orig: string;
        src_translit?: string;
    }[];
}

async function googleTranslate(text: string, targetLang: string, romanize: boolean): Promise<GoogleData | null> {
    const url = "https://translate.googleapis.com/translate_a/single?" + new URLSearchParams({
        // see https://stackoverflow.com/a/29537590 for more params
        // holy shidd nvidia
        client: "gtx",
        // source language
        sl: "auto",
        // target language
        tl: targetLang,
        // what to return, t = translation probably
        dt: romanize ? "rm" : "t",
        // Send json object response instead of weird array
        dj: "1",
        source: "input",
        // query, duh
        q: text
    });

    const res = await fetch(url);
    if (!res.ok)
        return null;

    return await res.json();
}

async function processLyrics(
    lyrics: LyricsData["lyricsVersions"][Provider],
    targetLang: string,
    romanize: boolean
): Promise<SyncedLyric[] | null> {
    if (!lyrics) return null;

    const nonDuplicatedLyrics = lyrics.filter((lyric, index, self) =>
        self.findIndex(l => l.text === lyric.text) === index
    );

    const processedLyricsResp = await Promise.all(
        nonDuplicatedLyrics.map(async lyric => {
            if (!lyric.text) return [lyric.text, null];

            const translation = await googleTranslate(lyric.text, targetLang, romanize);

            if (!translation || !translation.sentences || translation.sentences.length === 0) return [lyric.text, null];

            return [lyric.text, romanize ? translation.sentences[0].src_translit : translation.sentences[0].trans];
        })
    );

    if (processedLyricsResp[0][1] === null) return null;

    return lyrics.map(lyric => ({
        ...lyric,
        text: processedLyricsResp.find(mapping => mapping[0] === lyric.text)?.[1] ?? lyric.text
    }));
}

async function translateLyrics(lyrics: LyricsData["lyricsVersions"][Provider]): Promise<SyncedLyric[] | null> {
    const language = settings.store.TranslateTo;
    return processLyrics(lyrics, language, false);
}

async function romanizeLyrics(lyrics: LyricsData["lyricsVersions"][Provider]): Promise<SyncedLyric[] | null> {
    return processLyrics(lyrics, "", true);
}

export const lyricsAlternativeFetchers = {
    [Provider.Translated]: translateLyrics,
    [Provider.Romanized]: romanizeLyrics
};

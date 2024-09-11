/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFile } from "child_process";
import { promisify } from "util";

import type { TrackData } from ".";

const exec = promisify(execFile);

async function applescript(cmds: string[]) {
    const { stdout } = await exec("osascript", cmds.map(c => ["-e", c]).flat());
    return stdout;
}

function makeiTunesUrl(query: string) {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("media", "music");
    url.searchParams.set("entity", "musicTrack");
    url.searchParams.set("limit", "1");
    url.searchParams.set("term", query);
    return url;
}

const requestOptions: RequestInit = {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; rv:125.0) Gecko/20100101 Firefox/125.0" },
};

interface RemoteData {
    appleMusicLink?: string,
    songLink?: string,
    albumArtwork?: string,
    artistArtwork?: string;
}

let cachedRemoteData: { id: string, data: RemoteData; } | { id: string, failures: number; } | null = null;

const ARTIST_ARTWORK_REGEX = /,"image":"(https:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)\.png)"/;

async function fetchRemoteData({ id, name, artist, album }: { id: string, name: string, artist: string, album: string; }) {
    if (id === cachedRemoteData?.id) {
        if ("data" in cachedRemoteData) return cachedRemoteData.data;
        if ("failures" in cachedRemoteData && cachedRemoteData.failures >= 5) return null;
    }

    try {
        const { results: [{ trackId, trackViewUrl, artworkUrl100, artistViewUrl }] } = await fetch(
            makeiTunesUrl(name + " " + artist + " " + album), requestOptions
        ).then(r => r.json());

        const artistHtml = await fetch(artistViewUrl, requestOptions).then(r => r.text());
        const extractedArtistArtwork = artistHtml.match(ARTIST_ARTWORK_REGEX);

        cachedRemoteData = {
            id,
            data: {
                appleMusicLink: trackViewUrl,
                songLink: `https://song.link/i/${trackId}`,
                albumArtwork: artworkUrl100.replace("100x100", "512x512"),
                artistArtwork: extractedArtistArtwork ? extractedArtistArtwork[1].replace(/\d+x\d+bb/, "512x512bb") : undefined,
            }
        };

        return cachedRemoteData.data;
    } catch (e) {
        console.error("[AppleMusicRichPresence] Failed to fetch remote data:", e);
        cachedRemoteData = {
            id,
            failures: (id === cachedRemoteData?.id && "failures" in cachedRemoteData ? cachedRemoteData.failures : 0) + 1
        };
        return null;
    }
}

export async function fetchTrackData(): Promise<TrackData | null> {
    try {
        await exec("pgrep", ["^Music$"]);
    } catch (error) {
        return null;
    }

    const playerState = await applescript(['tell application "Music"', "get player state", "end tell"])
        .then(out => out.trim());
    if (playerState !== "playing") return null;

    const playerPosition = await applescript(['tell application "Music"', "get player position", "end tell"])
        .then(text => Number.parseFloat(text.trim()));

    const stdout = await applescript([
        'set output to ""',
        'tell application "Music"',
        "set t_id to database id of current track",
        "set t_name to name of current track",
        "set t_album to album of current track",
        "set t_artist to artist of current track",
        "set t_duration to duration of current track",
        'set output to "" & t_id & "\\n" & t_name & "\\n" & t_album & "\\n" & t_artist & "\\n" & t_duration',
        "end tell",
        "return output"
    ]);

    const [id, name, album, artist, durationStr] = stdout.split("\n").filter(k => !!k);
    const duration = Number.parseFloat(durationStr);

    const remoteData = await fetchRemoteData({ id, name, artist, album });

    return { name, album, artist, playerPosition, duration, ...remoteData };
}

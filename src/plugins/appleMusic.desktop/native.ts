/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFile } from "child_process";
import { promisify } from "util";

import type { TrackData } from ".";

const exec = promisify(execFile);

// function exec(file: string, args: string[] = []) {
//     return new Promise<{ code: number | null, stdout: string | null, stderr: string | null; }>((resolve, reject) => {
//         const process = spawn(file, args, { stdio: [null, "pipe", "pipe"] });

//         let stdout: string | null = null;
//         process.stdout.on("data", (chunk: string) => { stdout ??= ""; stdout += chunk; });
//         let stderr: string | null = null;
//         process.stderr.on("data", (chunk: string) => { stdout ??= ""; stderr += chunk; });

//         process.on("exit", code => { resolve({ code, stdout, stderr }); });
//         process.on("error", err => reject(err));
//     });
// }

async function applescript(cmds: string[]) {
    const { stdout } = await exec("osascript", cmds.map(c => ["-e", c]).flat());
    return stdout;
}

function makeSearchUrl(type: string, query: string) {
    const url = new URL("https://tools.applemediaservices.com/api/apple-media/music/US/search.json");
    url.searchParams.set("types", type);
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

async function fetchRemoteData({ id, name, artist, album }: { id: string, name: string, artist: string, album: string; }) {
    if (id === cachedRemoteData?.id) {
        if ("data" in cachedRemoteData) return cachedRemoteData.data;
        if ("failures" in cachedRemoteData && cachedRemoteData.failures >= 5) return null;
    }

    try {
        const [songData, artistData] = await Promise.all([
            fetch(makeSearchUrl("songs", artist + " " + album + " " + name), requestOptions).then(r => r.json()),
            fetch(makeSearchUrl("artists", artist.split(/ *[,&] */)[0]), requestOptions).then(r => r.json())
        ]);

        const appleMusicLink = songData?.songs?.data[0]?.attributes.url;
        const songLink = songData?.songs?.data[0]?.id ? `https://song.link/i/${songData?.songs?.data[0]?.id}` : undefined;

        const albumArtwork = songData?.songs?.data[0]?.attributes.artwork.url.replace("{w}", "512").replace("{h}", "512");
        const artistArtwork = artistData?.artists?.data[0]?.attributes.artwork.url.replace("{w}", "512").replace("{h}", "512");

        cachedRemoteData = {
            id,
            data: { appleMusicLink, songLink, albumArtwork, artistArtwork }
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

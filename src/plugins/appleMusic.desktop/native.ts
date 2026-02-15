/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { execFile } from "child_process";
import { promisify } from "util";

import type { TrackData } from ".";

const exec = promisify(execFile);

let authorization: string = '';

(async () => {
    const mainReq = await fetch('https://music.apple.com/us/new', { headers: { 'user-agent': VENCORD_USER_AGENT } });
    const mainRes = await mainReq.text();
    const scriptURL = mainRes.match(/<script type="module" crossorigin src="(.*?)"/)?.[1];
    if (!scriptURL) return console.log('dangit, apple music patched it [err 1]');

    const scriptReq = await fetch(`https://music.apple.com${scriptURL}`, { headers: { 'user-agent': VENCORD_USER_AGENT } });
    const scriptRes = await scriptReq.text();
    const authExtract = scriptRes.match(/"eyJ(.*?)"/)?.[1];
    if (!authExtract) return console.log('dangit, apple music patched it [err 2]');

    authorization = `eyJ${authExtract}`;
})();

const baseParams = new URLSearchParams();

baseParams.append('art[url]', 'f');
baseParams.append('extend', 'artistUrl');
baseParams.append('fields[albums]', 'artistName,artistUrl,artwork,name,url');
baseParams.append('fields[artists]', 'url,name,artwork');
baseParams.append('format[resources]', 'map');
baseParams.append('include[albums]', 'artists');
baseParams.append('include[songs]', 'artists');
baseParams.append('l', new Intl.DateTimeFormat().resolvedOptions().locale);
baseParams.append('limit', '1');
baseParams.append('omit[resource]', 'autos');
baseParams.append('platform', 'web');
baseParams.append('relate[albums]', 'artists');
baseParams.append('relate[songs]', 'albums');
baseParams.append('types', 'songs');
baseParams.append('with', 'lyricHighlights,lyrics,naturalLanguage,serverBubbles,subtitles');

async function applescript(cmds: string[]) {
    const { stdout } = await exec("osascript", cmds.map(c => ["-e", c]).flat());
    return stdout;
}

interface RemoteData {
    appleMusicLink?: string,
    songLink?: string,
    albumArtwork?: string,
    artistArtwork?: string;
}

let cachedRemoteData: { id: string, data: RemoteData; } | { id: string, failures: number; } | null = null;

const highResify = (string: string) => string.replace("{w}x{h}", "512x512").replace("{f}", "png");

async function fetchRemoteData({ id, name, artist, album }: { id: string, name: string, artist: string, album: string; }) {
    if (id === cachedRemoteData?.id) {
        if ("data" in cachedRemoteData) return cachedRemoteData.data;
        if ("failures" in cachedRemoteData && cachedRemoteData.failures >= 5) return null;
    }

    if (!authorization) return null;

    try {
        const params = new URLSearchParams(baseParams);
        params.set("term", `${name} by ${artist} on ${album}`);

        const songReq = await fetch("https://amp-api-edge.music.apple.com/v1/catalog/us/search?" + params.toString(), {
            headers: {
                "accept-language": "en-US,en;q=0.9",
                "authorization": "Bearer " + authorization,
                "origin": "https://music.apple.com",
                "Referer": "https://music.apple.com/",
                "user-agent": VENCORD_USER_AGENT,
            },
        });

        const songRes = await songReq.json();
        const songData = songRes.results.song.data[0];
        if (!songData) return null;

        const extendedData = songRes.resources.songs[songData.id];
        const primaryArtistId = extendedData.relationships.artists.data[0].id;
        const extendedArtistData = songRes.resources.artists[primaryArtistId];

        cachedRemoteData = {
            id,
            data: {
                appleMusicLink: `https://music.apple.com${songData.href}`,
                songLink: `https://song.link/i/${songData.id}`,
                albumArtwork: highResify(extendedData.attributes.artwork.url),
                artistArtwork: highResify(extendedArtistData.attributes.artwork.url)
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

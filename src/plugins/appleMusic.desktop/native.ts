/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { canonicalizeMatch } from "@utils/patches";
import { execFile } from "child_process";
import { promisify } from "util";

import type { TrackData } from ".";

const exec = promisify(execFile);

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

const APPLE_MUSIC_BUNDLE_REGEX = /<script type="module" crossorigin src="([a-zA-Z0-9.\-/]+)"><\/script>/;
const APPLE_MUSIC_TOKEN_REGEX = canonicalizeMatch(/\b(\i)="([A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*)"(?=.+?Bearer \$\{\1\})/);

let cachedToken: string | undefined = undefined;

const getToken = async () => {
    if (cachedToken) return cachedToken;

    const html = await fetch("https://music.apple.com/").then(r => r.text());
    const bundleUrl = new URL(html.match(APPLE_MUSIC_BUNDLE_REGEX)![1], "https://music.apple.com/");

    const bundle = await fetch(bundleUrl).then(r => r.text());
    const token = bundle.match(APPLE_MUSIC_TOKEN_REGEX)![2];

    cachedToken = token;
    return token;
};

async function fetchRemoteData({ id, name, artist, album }: { id: string, name: string, artist: string, album: string; }) {
    if (id === cachedRemoteData?.id) {
        if ("data" in cachedRemoteData) return cachedRemoteData.data;
        if ("failures" in cachedRemoteData && cachedRemoteData.failures >= 5) return null;
    }

    try {
        const dataUrl = new URL("https://amp-api-edge.music.apple.com/v1/catalog/us/search");
        dataUrl.searchParams.set("platform", "web");
        dataUrl.searchParams.set("l", "en-US");
        dataUrl.searchParams.set("limit", "1");
        dataUrl.searchParams.set("with", "serverBubbles");
        dataUrl.searchParams.set("types", "songs");
        dataUrl.searchParams.set("term", `${name} ${artist} ${album}`);
        dataUrl.searchParams.set("include[songs]", "artists");

        const token = await getToken();

        const songData = await fetch(dataUrl, {
            headers: {
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9",
                "authorization": `Bearer ${token}`,
                "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                "origin": "https://music.apple.com",
            },
        })
            .then(r => r.json())
            .then(data => data.results.song.data[0]);

        cachedRemoteData = {
            id,
            data: {
                appleMusicLink: songData.attributes.url,
                songLink: `https://song.link/i/${songData.id}`,
                albumArtwork: songData.attributes.artwork.url.replace("{w}x{h}", "512x512"),
                artistArtwork: songData.relationships.artists.data[0].attributes.artwork.url.replace("{w}x{h}", "512x512"),
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

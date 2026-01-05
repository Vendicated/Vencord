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

async function fetchRemoteData({ id, name, artist, album }: { id: string, name: string, artist: string, album: string; }) {
    if (id === cachedRemoteData?.id) {
        if ("data" in cachedRemoteData) return cachedRemoteData.data;
        if ("failures" in cachedRemoteData && cachedRemoteData.failures >= 5) return null;
    }

    try {
        const dataUrl = new URL("https://itunes.apple.com/search");
        dataUrl.searchParams.set("term", `${name} ${artist} ${album}`);
        dataUrl.searchParams.set("media", "music");
        dataUrl.searchParams.set("entity", "song");

        const songData = await fetch(dataUrl, {
            headers: {
                "user-agent": VENCORD_USER_AGENT,
            },
        })
            .then(r => r.json())
            .then(data => data.results.find(song => song.collectionName === album) || data.results[0]);

        const artistArtworkURL = await fetch(songData.artistViewUrl)
            .then(r => r.text())
            .then(data => {
                const match = data.match(/<meta property="og:image" content="(.+?)">/);
                return match ? match[1].replace(/[0-9]+x.+/, "220x220bb-60.png") : undefined;
            })
            .catch(() => void 0);

        cachedRemoteData = {
            id,
            data: {
                appleMusicLink: songData.trackViewUrl,
                songLink: `https://song.link/i/${new URL(songData.trackViewUrl).searchParams.get("i")}`,
                albumArtwork: (songData.artworkUrl100).replace("100x100", "512x512"),
                artistArtwork: artistArtworkURL
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

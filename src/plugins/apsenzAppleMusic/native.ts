/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type IpcMainInvokeEvent } from "electron";
import { execFile } from "child_process";
import { appendFileSync, mkdirSync } from "fs";
import net from "net";
import { join } from "path";
import { promisify } from "util";

const exec = promisify(execFile);

const logDir = join(process.env.APPDATA || process.cwd(), "ApsenzAppleMusic");
const logFile = join(logDir, "native.log");

function log(message: string, data?: unknown) {
    try {
        mkdirSync(logDir, { recursive: true });

        appendFileSync(
            logFile,
            `[${new Date().toISOString()}] ${message}${data === undefined ? "" : " " + safeStringify(data)}\n`,
            "utf8"
        );
    } catch {
    }
}

function safeStringify(value: unknown) {
    try {
        return typeof value === "string" ? value : JSON.stringify(value);
    } catch {
        return String(value);
    }
}

export interface TrackData {
    sourceAppUserModelId?: string;
    name: string;
    artist?: string;
    album?: string;
    isPlaying: boolean;
    playerPosition?: number;
    duration?: number;
    appleMusicLink?: string;
    appleMusicArtistLink?: string;
    albumLink?: string;
    albumArtwork?: string;
}

interface ItunesResult {
    trackId?: number;
    artistId?: number;
    collectionId?: number;
    trackName?: string;
    artistName?: string;
    collectionName?: string;
    artworkUrl100?: string;
    artworkUrl60?: string;
    trackViewUrl?: string;
    artistViewUrl?: string;
    collectionViewUrl?: string;
    trackTimeMillis?: number;
}

const Opcode = {
    Handshake: 0,
    Frame: 1,
    Close: 2,
    Ping: 3,
    Pong: 4
} as const;

let socket: net.Socket | null = null;
let connectedClientId = "";
let connected = false;
let readBuffer = Buffer.alloc(0);
let cachedRemote: { key: string; data: Partial<TrackData> } | null = null;
let connectPromise: Promise<void> | null = null;

export async function getTrackData(_: IpcMainInvokeEvent, country?: string, debugLogs = false): Promise<TrackData | null> {
    const raw = await readAppleMusicTrack(debugLogs);

    if (!raw)
        return null;

    const remote = await fetchAppleMetadata(raw, country);

    const track: TrackData = {
        ...raw,
        ...remote,
        artist: raw.artist || remote.artist || "Unknown Artist",
        album: raw.album || remote.album
    };

    if (debugLogs)
        log("track data", track);

    return track;
}

export async function setActivity(_: IpcMainInvokeEvent, clientId: string, activity: any) {
    const id = String(clientId || "").trim();

    if (!id) {
        log("missing client id in setActivity");
        return;
    }

    await ensureConnected(id);

    sendRaw(Opcode.Frame, {
        cmd: "SET_ACTIVITY",
        args: {
            pid: process.pid,
            activity
        },
        nonce: nonce()
    });

    log("sent activity", activity);
}

export async function clearActivity(_: IpcMainInvokeEvent, clientId?: string) {
    const id = String(clientId || connectedClientId || "").trim();

    if (!id)
        return;

    try {
        await ensureConnected(id);

        sendRaw(Opcode.Frame, {
            cmd: "SET_ACTIVITY",
            args: {
                pid: process.pid,
                activity: null
            },
            nonce: nonce()
        });

        log("cleared activity");
    } catch (error) {
        log("clear failed", String(error));
    }
}

export async function stop(_: IpcMainInvokeEvent) {
    try {
        await clearInternal();
    } catch {
    }

    closeSocket();
}

async function clearInternal() {
    if (!socket || !connected)
        return;

    sendRaw(Opcode.Frame, {
        cmd: "SET_ACTIVITY",
        args: {
            pid: process.pid,
            activity: null
        },
        nonce: nonce()
    });
}

async function ensureConnected(clientId: string) {
    if (socket && connected && connectedClientId === clientId)
        return;

    if (connectPromise) {
        await connectPromise;

        if (socket && connected && connectedClientId === clientId)
            return;
    }

    connectPromise = (async () => {
        closeSocket();

        socket = await connectToDiscordPipe();
        connectedClientId = clientId;
        connected = false;
        readBuffer = Buffer.alloc(0);

        socket.on("data", handleSocketData);
        socket.on("error", error => {
            log("socket error", String(error));
            closeSocket();
        });
        socket.on("close", () => {
            connected = false;
            socket = null;
        });

        sendRaw(Opcode.Handshake, {
            v: 1,
            client_id: clientId
        });

        await sleep(750);

        connected = true;
        log("connected to Discord IPC", { clientId });
    })();

    try {
        await connectPromise;
    } finally {
        connectPromise = null;
    }
}

function handleSocketData(data: Buffer) {
    readBuffer = Buffer.concat([readBuffer, data]);

    while (readBuffer.length >= 8) {
        const opcode = readBuffer.readInt32LE(0);
        const length = readBuffer.readInt32LE(4);

        if (readBuffer.length < 8 + length)
            return;

        const body = readBuffer.slice(8, 8 + length).toString("utf8");
        readBuffer = readBuffer.slice(8 + length);

        if (opcode === Opcode.Ping) {
            try {
                sendRaw(Opcode.Pong, JSON.parse(body));
            } catch {
                sendRaw(Opcode.Pong, {});
            }

            continue;
        }

        try {
            const packet = JSON.parse(body);

            if (packet?.evt === "ERROR" || packet?.cmd === "ERROR")
                log("Discord IPC error", packet);
        } catch {
        }
    }
}

async function connectToDiscordPipe(): Promise<net.Socket> {
    const errors: string[] = [];

    for (let i = 0; i < 10; i++) {
        const pipePath = `\\\\.\\pipe\\discord-ipc-${i}`;

        try {
            return await new Promise<net.Socket>((resolve, reject) => {
                const s = net.createConnection(pipePath);
                const timeout = setTimeout(() => {
                    s.destroy();
                    reject(new Error(`Timeout connecting to ${pipePath}`));
                }, 900);

                s.once("connect", () => {
                    clearTimeout(timeout);
                    resolve(s);
                });

                s.once("error", error => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
        } catch (error) {
            errors.push(String(error));
        }
    }

    throw new Error(`Could not connect to Discord IPC. ${errors.join(" | ")}`);
}

function sendRaw(opcode: number, payload: unknown) {
    if (!socket)
        throw new Error("Socket is not connected");

    const json = JSON.stringify(payload);
    const body = Buffer.from(json, "utf8");
    const header = Buffer.alloc(8);

    header.writeInt32LE(opcode, 0);
    header.writeInt32LE(body.length, 4);

    socket.write(Buffer.concat([header, body]));
}

function closeSocket() {
    connected = false;

    if (!socket)
        return;

    try {
        socket.destroy();
    } catch {
    }

    socket = null;
}

function nonce() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const mediaScript = String.raw`
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Output is ASCII base64, so Windows codepages cannot destroy Arabic/Japanese/etc.
function Write-Base64Json($Object) {
    if ($null -eq $Object) {
        Write-Output ""
        return
    }

    $json = $Object | ConvertTo-Json -Compress -Depth 20
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $base64 = [Convert]::ToBase64String($bytes)

    [Console]::Out.Write($base64)
}

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
        $_.Name -eq "AsTask" -and
        $_.GetParameters().Count -eq 1 -and
        $_.GetParameters()[0].ParameterType.Name.StartsWith("IAsyncOperation")
    } | Select-Object -First 1)

if ($null -eq $asTaskGeneric) {
    throw "Could not find WindowsRuntime AsTask generic method"
}

function Await($Operation, $ResultType) {
    $task = $asTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $task.Wait(-1) | Out-Null
    return $task.Result
}

function IsAppleMusicSource($Source) {
    if ([string]::IsNullOrWhiteSpace($Source)) {
        return $false
    }

    return (
        $Source -like "*AppleInc.AppleMusicWin*" -or
        $Source -like "*AppleMusic*" -or
        $Source -like "*Apple*Music*" -or
        $Source -like "*iTunes*" -or
        $Source -like "*Music.UI*" -or
        $Source -like "*AMPlayer*"
    )
}

$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]

$manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$sessions = $manager.GetSessions()

$session = $sessions |
    Where-Object { IsAppleMusicSource $_.SourceAppUserModelId } |
    Select-Object -First 1

# Fallback only if Apple Music source was not detected. Keeps all songs working if Windows names the session weirdly.
if ($null -eq $session) {
    $session = $manager.GetCurrentSession()
}

if ($null -eq $session) {
    Write-Base64Json $null
    exit 0
}

$props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
$timeline = $session.GetTimelineProperties()
$playback = $session.GetPlaybackInfo()

$title = [string]$props.Title
$artist = [string]$props.Artist
$album = [string]$props.AlbumTitle

if ([string]::IsNullOrWhiteSpace($title)) {
    Write-Base64Json $null
    exit 0
}

# Apple Music for Windows sometimes puts "Artist - Album" inside Artist.
if ([string]::IsNullOrWhiteSpace($album) -and $artist -match "\s[--]\s") {
    $parts = $artist -split "\s[--]\s", 2
    if ($parts.Count -ge 2) {
        $artist = $parts[0]
        $album = $parts[1]
    }
}

$duration = 0
if ($timeline.EndTime -gt $timeline.StartTime) {
    $duration = [int][Math]::Max(0, ($timeline.EndTime - $timeline.StartTime).TotalSeconds)
}

$position = [int][Math]::Max(0, $timeline.Position.TotalSeconds)
if ($duration -gt 0 -and $position -gt $duration) {
    $position = $duration
}

$status = $playback.PlaybackStatus.ToString()
$isPlaying = $status -eq "Playing"

Write-Base64Json ([PSCustomObject]@{
    sourceAppUserModelId = [string]$session.SourceAppUserModelId
    name = $title.Trim()
    artist = $artist.Trim()
    album = $album.Trim()
    isPlaying = $isPlaying
    playerPosition = $position
    duration = $duration
    status = $status
})

`;

async function readAppleMusicTrack(debugLogs = false): Promise<TrackData | null> {
    let stdout = "";

    try {
        // PowerShell -EncodedCommand expects UTF-16LE. The script outputs Base64(JSON_UTF8),
        // so stdout contains only ASCII and no language can get mangled by the console codepage.
        const encodedCommand = Buffer.from(mediaScript, "utf16le").toString("base64");

        ({ stdout } = await exec("powershell.exe", [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-EncodedCommand",
            encodedCommand
        ], {
            timeout: 6500,
            windowsHide: true,
            encoding: "utf8",
            maxBuffer: 1024 * 1024
        }));
    } catch (error) {
        log("PowerShell media read failed", String(error));
        return null;
    }

    const base64 = stdout.trim();

    if (!base64)
        return null;

    let json = "";

    try {
        json = Buffer.from(base64, "base64").toString("utf8").trim();
    } catch (error) {
        log("failed to decode base64 UTF-8 track data", { base64, error: String(error) });
        return null;
    }

    if (!json || json === "null")
        return null;

    try {
        const track = JSON.parse(json) as TrackData;

        if (debugLogs)
            log("raw track", track);

        return track.name ? track : null;
    } catch (error) {
        log("bad decoded media JSON", json);
        return null;
    }
}

async function fetchAppleMetadata(track: TrackData, countryInput?: string): Promise<Partial<TrackData>> {
    const primaryCountry = /^[a-z]{2}$/i.test(countryInput || "") ? countryInput!.toLowerCase() : "de";
    const key = `${primaryCountry}|${track.name}|${track.artist}|${track.album}`.toLowerCase();

    if (cachedRemote?.key === key)
        return cachedRemote.data;

    const countries = unique([primaryCountry, "us", "gb", "de"]);
    const songTerms = buildSongSearchTerms(track);
    const albumTerms = buildAlbumSearchTerms(track);

    let bestSong: { country: string; result: ItunesResult; score: number } | undefined;

    for (const country of countries) {
        for (const term of songTerms) {
            const results = await searchItunes(term, country, "song");

            if (!results.length) {
                log("metadata song search empty", { country, term });
                continue;
            }

            const candidate = scoreBest(results, track);

            log("metadata song search candidate", {
                country,
                term,
                score: candidate?.score,
                trackName: candidate?.result.trackName,
                artistName: candidate?.result.artistName,
                collectionName: candidate?.result.collectionName
            });

            if (candidate && (!bestSong || candidate.score > bestSong.score)) {
                bestSong = {
                    country,
                    result: candidate.result,
                    score: candidate.score
                };
            }

            // Good enough. Stop wasting electricity like a tiny server goblin.
            if (bestSong && bestSong.score >= 180)
                break;
        }

        if (bestSong && bestSong.score >= 180)
            break;
    }

    let bestAlbum: { country: string; result: ItunesResult; score: number } | undefined;

    // If song search did not find a solid result with artwork, try album search for artwork fallback.
    if (!bestSong || bestSong.score < 140 || !upgradeArtwork(bestSong.result.artworkUrl100 || bestSong.result.artworkUrl60)) {
        for (const country of countries) {
            for (const term of albumTerms) {
                const results = await searchItunes(term, country, "album");

                if (!results.length) {
                    log("metadata album search empty", { country, term });
                    continue;
                }

                const candidate = scoreBest(results, track);

                log("metadata album search candidate", {
                    country,
                    term,
                    score: candidate?.score,
                    trackName: candidate?.result.trackName,
                    artistName: candidate?.result.artistName,
                    collectionName: candidate?.result.collectionName
                });

                if (candidate && (!bestAlbum || candidate.score > bestAlbum.score)) {
                    bestAlbum = {
                        country,
                        result: candidate.result,
                        score: candidate.score
                    };
                }

                if (bestAlbum && bestAlbum.score >= 90)
                    break;
            }

            if (bestAlbum && bestAlbum.score >= 90)
                break;
        }
    }

    const chosen = bestSong?.score && bestSong.score >= 90
        ? bestSong
        : undefined;

    const fallbackAlbum = bestAlbum?.score && bestAlbum.score >= 55
        ? bestAlbum
        : undefined;

    if (!chosen && !fallbackAlbum) {
        log("metadata not found", {
            name: track.name,
            artist: track.artist,
            album: track.album,
            triedCountries: countries,
            triedSongTerms: songTerms,
            triedAlbumTerms: albumTerms
        });

        cachedRemote = { key, data: {} };
        return {};
    }

    const result = chosen?.result || fallbackAlbum!.result;
    const country = chosen?.country || fallbackAlbum!.country;
    const exactTrack = chosen ? isExactTrack(result, track) : false;

    const remote: Partial<TrackData> = {
        album: track.album || result.collectionName,
        albumArtwork: upgradeArtwork(result.artworkUrl100 || result.artworkUrl60),
        appleMusicLink: chosen && exactTrack && result.trackId
            ? `https://music.apple.com/${country}/song/${slug(result.trackName)}/${result.trackId}`
            : undefined,
        appleMusicArtistLink: result.artistId
            ? `https://music.apple.com/${country}/artist/${slug(result.artistName)}/${result.artistId}`
            : result.artistViewUrl,
        albumLink: result.collectionId
            ? `https://music.apple.com/${country}/album/${slug(result.collectionName)}/${result.collectionId}`
            : result.collectionViewUrl
    };

    cachedRemote = { key, data: remote };
    log("metadata fetched", {
        score: chosen?.score ?? fallbackAlbum?.score,
        source: chosen ? "song" : "album",
        country,
        resultTrack: result.trackName,
        resultArtist: result.artistName,
        resultAlbum: result.collectionName,
        ...remote
    });

    return remote;
}

async function searchItunes(term: string, country: string, entity: "song" | "album"): Promise<ItunesResult[]> {
    try {
        const url = new URL("https://itunes.apple.com/search");
        url.searchParams.set("term", term);
        url.searchParams.set("country", country);
        url.searchParams.set("media", "music");
        url.searchParams.set("entity", entity);
        url.searchParams.set("limit", "25");
        url.searchParams.set("explicit", "Yes");
        url.searchParams.set("lang", "en_us");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2200);

        try {
            const data = await fetch(url, { signal: controller.signal }).then(r => r.json()) as { results?: ItunesResult[] };
            return data.results || [];
        } finally {
            clearTimeout(timeout);
        }
    } catch (error) {
        log("metadata search failed", { term, country, entity, error: String(error) });
        return [];
    }
}

function buildSongSearchTerms(track: TrackData) {
    return unique([
        `${track.name} ${track.artist ?? ""} ${track.album ?? ""}`,
        `${track.name} ${track.artist ?? ""}`,
        `${track.name} ${track.album ?? ""}`,
        `${track.album ?? ""} ${track.artist ?? ""}`,
        `${track.name}`,
        `${stripFeaturing(track.name)} ${track.artist ?? ""}`,
        `${stripBrackets(track.name)} ${track.artist ?? ""}`
    ].map(v => v.replace(/\s+/g, " ").trim()).filter(Boolean));
}

function buildAlbumSearchTerms(track: TrackData) {
    return unique([
        `${track.album ?? ""} ${track.artist ?? ""}`,
        `${stripSingle(track.album)} ${track.artist ?? ""}`,
        `${track.name} ${track.artist ?? ""}`,
        `${track.artist ?? ""} ${track.name}`
    ].map(v => v.replace(/\s+/g, " ").trim()).filter(Boolean));
}

function unique<T>(values: T[]) {
    return [...new Set(values)];
}

function scoreBest(results: ItunesResult[], track: TrackData) {
    let best: { result: ItunesResult; score: number } | undefined;

    for (const result of results) {
        const score = scoreResult(result, track);

        if (!best || score > best.score)
            best = { result, score };
    }

    return best;
}

function scoreResult(result: ItunesResult, track: TrackData) {
    const wantedTitle = norm(track.name);
    const wantedArtist = norm(track.artist);
    const wantedAlbum = norm(track.album);

    const resultTitle = norm(result.trackName);
    const resultArtist = norm(result.artistName);
    const resultAlbum = norm(result.collectionName);

    const titleExact = Boolean(wantedTitle && resultTitle === wantedTitle);
    const titleLoose = Boolean(wantedTitle && resultTitle && (resultTitle.includes(wantedTitle) || wantedTitle.includes(resultTitle)));

    const strippedWantedTitle = norm(stripFeaturing(stripBrackets(track.name)));
    const strippedExact = Boolean(strippedWantedTitle && resultTitle === strippedWantedTitle);

    const artistExact = Boolean(wantedArtist && resultArtist === wantedArtist);
    const artistLoose = Boolean(wantedArtist && resultArtist && (resultArtist.includes(wantedArtist) || wantedArtist.includes(resultArtist)));

    const albumExact = Boolean(wantedAlbum && resultAlbum === wantedAlbum);
    const albumLoose = Boolean(wantedAlbum && resultAlbum && (resultAlbum.includes(wantedAlbum) || wantedAlbum.includes(resultAlbum)));

    let durationClose = false;
    let durationVeryClose = false;

    if (track.duration && result.trackTimeMillis) {
        const resultSeconds = Math.round(result.trackTimeMillis / 1000);
        const diff = Math.abs(resultSeconds - track.duration);

        durationVeryClose = diff <= 2;
        durationClose = diff <= 7;
    }

    let score = 0;

    if (titleExact)
        score += 100;
    else if (strippedExact)
        score += 85;
    else if (titleLoose)
        score += 45;

    if (artistExact)
        score += 80;
    else if (artistLoose)
        score += 50;

    if (albumExact)
        score += 45;
    else if (albumLoose)
        score += 25;

    if (durationVeryClose)
        score += 30;
    else if (durationClose)
        score += 15;

    if (result.artworkUrl100 || result.artworkUrl60)
        score += 10;

    // Hard penalty: same title but wrong artist and wrong album is usually a false match.
    // Example from your log: Sarcoma matched another artist because humans named two songs the same.
    if ((titleExact || strippedExact) && wantedArtist && !artistExact && !artistLoose && wantedAlbum && !albumExact && !albumLoose)
        score -= 90;

    // Do not trust a candidate with no artist/album relation unless the duration is extremely close.
    if ((titleExact || strippedExact) && wantedArtist && !artistExact && !artistLoose && wantedAlbum && !albumExact && !albumLoose && !durationVeryClose)
        score -= 60;

    return score;
}

function isExactTrack(result: ItunesResult, track: TrackData) {
    const wantedTitle = norm(track.name);
    const resultTitle = norm(result.trackName);

    return Boolean(wantedTitle && resultTitle === wantedTitle);
}

function upgradeArtwork(url?: string) {
    if (!url)
        return undefined;

    return url
        .replace(/\d+x\d+bb\.(jpg|jpeg|png|webp)$/i, "1000x1000bb.$1")
        .replace(/100x100bb\.(jpg|jpeg|png|webp)$/i, "1000x1000bb.$1");
}


function stripFeaturing(value?: string) {
    return (value || "")
        .replace(/\s*\((?:feat\.?|ft\.?|with)[^)]+\)\s*/ig, " ")
        .replace(/\s*(?:feat\.?|ft\.?)\s+.+$/ig, " ")
        .trim();
}

function stripBrackets(value?: string) {
    return (value || "")
        .replace(/\s*\([^)]*\)\s*/g, " ")
        .replace(/\s*\[[^\]]*\]\s*/g, " ")
        .trim();
}

function stripSingle(value?: string) {
    return (value || "")
        .replace(/\s*-\s*single$/i, "")
        .trim();
}

function norm(value?: string) {
    return (value || "")
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/[''`']/g, "")
        .replace(/[------]/g, "-")
        .replace(/&/g, " and ")
        .replace(/\s+/g, " ")
        .replace(/\s*\(.*?\)\s*/g, " ")
        .replace(/\s*\[.*?\]\s*/g, " ")
        .replace(/\s*-\s*single$/g, "")
        .trim();
}

function slug(value?: string) {
    return (value || "music")
        .toLowerCase()
        .replace(/['']/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "music";
}

log("native module loaded");

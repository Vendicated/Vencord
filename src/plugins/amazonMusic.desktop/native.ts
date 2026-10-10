/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

import type { TrackData } from ".";

const exec = promisify(execFile);

const WINDOWS_SMTC_SCRIPT = `
# ensure utf-8 output from powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and 
    $_.GetParameters().Count -eq 1 -and 
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' 
})[0]

function Await($asyncOp, $type) {
    $method = $asTaskGeneric.MakeGenericMethod($type)
    return $method.Invoke($null, @($asyncOp)).GetAwaiter().GetResult()
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
$managerOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
$mgr = Await $managerOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

$session = $null
$cur = $mgr.GetCurrentSession()
if ($cur -and $cur.SourceAppUserModelId -match "AmazonMusic") {
    $session = $cur
} else {
    foreach ($s in $mgr.GetSessions()) {
        if ($s.SourceAppUserModelId -match "AmazonMusic") {
            $session = $s
            break
        }
    }
}

if (-not $session) {
    Write-Output "null"
    exit
}

$playback = $session.GetPlaybackInfo()
$status = "$($playback.PlaybackStatus)"
if ($status -ne "Playing") {
    Write-Output "null"
    exit
}

$propsOp = $session.TryGetMediaPropertiesAsync()
$props = Await $propsOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])

$retry = 0
while ($retry -lt 3 -and [string]::IsNullOrWhiteSpace($props.Title)) {
    Start-Sleep -Milliseconds 200
    $propsOp = $session.TryGetMediaPropertiesAsync()
    $props = Await $propsOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $retry++
}

$timeline = $session.GetTimelineProperties()
$pos = if ($timeline.Position) { [int]$timeline.Position.TotalSeconds } else { 0 }
$dur = if ($timeline.EndTime) { [int]$timeline.EndTime.TotalSeconds } else { 0 }

$title = ($props.Title -replace '\\s*\\[Explicit\\]\\s*', '' -replace '\\s*\\[Clean\\]\\s*', '').Trim()

if (-not $title) {
    Write-Output "null"
    exit
}

$rawArtist = "$($props.Artist)"
$artist = if ($rawArtist -match '•') { ($rawArtist -split '•')[0].Trim() } else { $rawArtist.Trim() }

[PSCustomObject]@{
    title = $title
    artist = $artist
    album = $props.AlbumTitle
    position = $pos
    duration = $dur
} | ConvertTo-Json -Compress
`;

interface AmazonTrackMetadata {
    artist?: string;
    album?: string;
    duration?: number;
    albumArtwork?: string;
    amazonMusicLink?: string;
}

let cachedMetadata: { key: string; data: AmazonTrackMetadata; } | null = null;

function getAmazonMusicDir(): string | null {
    const localAppData = process.env.LOCALAPPDATA ?? "";
    const candidates = [
        path.join(localAppData, "Packages", "AmazonMobileLLC.AmazonMusic_kc6t79cpj4tp0", "LocalCache", "Local", "Amazon Music"),
        path.join(localAppData, "Amazon Music")
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

function cleanImageUrl(url?: string): string | undefined {
    if (!url) return undefined;
    const match = url.match(/(https:\/\/m\.media-amazon\.com\/images\/I\/[a-zA-Z0-9_\-\.\+]+?)(?:\.[_A-Za-z0-9]+)*\.(?:jpg|jpeg|png|webp)/i);
    return match ? `${match[1]}.jpg` : url;
}

function sanitize(text?: string): string {
    return (text ?? "")
        .replace(/\s*\[.*?\]/g, "")
        .replace(/\s*\(feat\..*?\)/gi, "")
        .replace(/\s*\(ft\..*?\)/gi, "")
        .trim();
}

function normalizeAccents(text: string): string {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// needed because amazon smtc leaves artist and duration blank
function searchCacheForMetadata(baseDir: string, title: string, rawArtist?: string): AmazonTrackMetadata | null {
    const clean = sanitize(title);
    const cleanLower = clean.toLowerCase();
    const cleanNorm = normalizeAccents(clean);
    const cleanArtist = rawArtist ? normalizeAccents(sanitize(rawArtist)) : "";

    const searchDirs = [
        path.join(baseDir, "Data", "Local Storage"),
        path.join(baseDir, "Data", "Library")
    ];

    for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;

        let files: string[];
        try {
            files = fs.readdirSync(dir)
                .filter(f => f.endsWith(".log") || f.endsWith(".ldb"))
                .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs, size: fs.statSync(path.join(dir, f)).size }))
                .filter(f => f.size < 25000000)
                .sort((a, b) => b.time - a.time)
                .map(f => f.name);
        } catch {
            continue;
        }

        for (const file of files) {
            let buf: Buffer;
            try {
                buf = fs.readFileSync(path.join(dir, file));
            } catch {
                continue;
            }

            // amazon stores playback history in utf-16le
            if (file.endsWith(".log")) {
                const needles = [
                    Buffer.from(clean, "utf16le"),
                    Buffer.from(cleanNorm, "utf16le")
                ];

                for (const targetNeedle of needles) {
                    let bytePos = 0;
                    while ((bytePos = buf.indexOf(targetNeedle, bytePos)) !== -1) {
                        const slice = buf.slice(bytePos, Math.min(buf.length, bytePos + 1400));
                        const s1 = slice.toString("utf16le");
                        const s2 = slice.slice(1).toString("utf16le");
                        const combined = `${s1}\n${s2}`;

                        const imgMatch = combined.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[a-zA-Z0-9_\-\.\+]+/);
                        if (imgMatch) {
                            let duration: number | undefined;
                            const durMatch = s1.match(/[\x00-\x1F](\d{2,4})\n\u0000B[0-9A-Z]{9}/);
                            if (durMatch) duration = parseInt(durMatch[1], 10);

                            let artist: string | undefined;
                            const artistMatch = s2.match(/[\x00-\x1F]([A-Za-z0-9\s,&'.\-_()[\]]+?)\n[\x00-\x1F]B[0-9A-Z]{9}/);
                            if (artistMatch) artist = artistMatch[1].trim();

                            let album: string | undefined;
                            const albumMatch = s2.match(/([A-Za-z0-9\s,&'.\-_()[\]]+?)\n\u0000[A-Za-z0-9]+\u0000https/);
                            if (albumMatch) album = albumMatch[1].trim();

                            return {
                                artist,
                                album,
                                duration,
                                albumArtwork: cleanImageUrl(imgMatch[0]),
                                amazonMusicLink: `https://music.amazon.com/search/${encodeURIComponent(artist ? `${title} ${artist}` : title)}`
                            };
                        }
                        bytePos += targetNeedle.length;
                    }
                }
            }

            const latin = buf.toString("latin1");
            let idx8 = 0;
            while ((idx8 = latin.toLowerCase().indexOf(cleanLower, idx8)) !== -1) {
                const chunk = latin.slice(Math.max(0, idx8 - 400), Math.min(latin.length, idx8 + 1500));
                const jsonMatch = chunk.match(/\{"id"[^}]+"title"[^}]+\}/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[0]);
                        const pTitleNorm = normalizeAccents(sanitize(parsed.title || parsed.primaryTitle || ""));
                        if (pTitleNorm === cleanNorm || pTitleNorm.includes(cleanNorm) || cleanNorm.includes(pTitleNorm)) {
                            const pArtist = parsed.artist?.name;
                            const pArtistNorm = pArtist ? normalizeAccents(sanitize(pArtist)) : "";
                            if (!cleanArtist || !pArtistNorm || pArtistNorm.includes(cleanArtist) || cleanArtist.includes(pArtistNorm)) {
                                return {
                                    artist: parsed.artist?.name,
                                    album: parsed.album?.title || parsed.album?.name,
                                    duration: parsed.duration ? parseInt(parsed.duration, 10) : undefined,
                                    albumArtwork: cleanImageUrl(parsed.album?.image),
                                    amazonMusicLink: parsed.album?.asin && parsed.asin ? `https://music.amazon.com/albums/${parsed.album.asin}?trackAsin=${parsed.asin}` : undefined
                                };
                            }
                        }
                    } catch {}
                }
                idx8 += cleanLower.length;
            }
        }
    }

    return null;
}

function resolveAmazonMetadata(title: string, rawArtist?: string, rawAlbum?: string): AmazonTrackMetadata | null {
    const cleanTitle = sanitize(title);
    const key = `${cleanTitle.toLowerCase()}|${(rawArtist || "").toLowerCase()}|${(rawAlbum || "").toLowerCase()}`;

    if (cachedMetadata && cachedMetadata.key === key) {
        return cachedMetadata.data;
    }

    const baseDir = getAmazonMusicDir();
    if (!baseDir) return null;

    const metadata = searchCacheForMetadata(baseDir, cleanTitle, rawArtist);
    if (metadata) {
        cachedMetadata = { key, data: metadata };
        return metadata;
    }

    return null;
}

let lastSeekEvent: { timestamp: string; seekSeconds: number; } | null = null;

function getLatestSeek(baseDir: string): number | null {
    const logPath = path.join(baseDir, "Logs", "AmazonMusic.log");
    if (!fs.existsSync(logPath)) return null;

    try {
        const fd = fs.openSync(logPath, "r");
        const stat = fs.fstatSync(fd);
        const bufSize = Math.min(stat.size, 65536);
        const buf = Buffer.alloc(bufSize);
        fs.readSync(fd, buf, 0, bufSize, stat.size - bufSize);
        fs.closeSync(fd);

        const text = buf.toString("utf8");
        const lines = text.split("\n");

        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            const match = line.match(/^(\d{6}:\d{6}).*?seek.*?seek_time:\s*(\d+)/i) || line.match(/^(\d{6}:\d{6}).*?Seeking to:\s*(\d+)/i);
            if (match) {
                const timestamp = match[1];
                const seekSeconds = Math.round(parseInt(match[2], 10) / 1000);
                if (!lastSeekEvent || lastSeekEvent.timestamp !== timestamp) {
                    lastSeekEvent = { timestamp, seekSeconds };
                    return seekSeconds;
                }
                break;
            }
        }
    } catch {}

    return null;
}

export async function fetchTrackData(): Promise<TrackData | null> {
    if (process.platform === "win32") {
        try {
            const { stdout } = await exec("powershell.exe", [
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy", "Bypass",
                "-Command", WINDOWS_SMTC_SCRIPT,
            ]);

            const trimmed = stdout.trim();
            if (!trimmed || trimmed === "null") return null;

            const parsed = JSON.parse(trimmed);
            if (!parsed.title) return null;

            const name = parsed.title;
            let artist = parsed.artist ? String(parsed.artist).trim() : undefined;
            let album = parsed.album ? String(parsed.album).trim() : undefined;
            let duration = parsed.duration ? Number(parsed.duration) : undefined;
            let playerPosition = typeof parsed.position === "number" ? parsed.position : 0;

            const baseDir = getAmazonMusicDir();
            if (baseDir) {
                const seekPos = getLatestSeek(baseDir);
                if (typeof seekPos === "number") {
                    playerPosition = seekPos;
                }
            }

            const amz = resolveAmazonMetadata(name, artist, album);
            if (amz) {
                if (!artist && amz.artist) artist = amz.artist;
                if (!album && amz.album) album = amz.album;
                if ((!duration || duration === 0) && amz.duration) duration = amz.duration;
            }

            const searchParam = encodeURIComponent(artist ? `${name} ${artist}` : name);
            const amazonMusicLink = amz?.amazonMusicLink ?? `https://music.amazon.com/search/${searchParam}`;

            return {
                name,
                artist,
                album,
                playerPosition,
                duration,
                amazonMusicLink,
                albumArtwork: amz?.albumArtwork
            };
        } catch {
            return null;
        }
    }

    return null;
}

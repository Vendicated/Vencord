/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DATA_DIR } from "@main/utils/constants";
import { type ChildProcess, execFile, spawn } from "child_process";
import { createHash, randomUUID } from "crypto";
import { desktopCapturer, IpcMainInvokeEvent, Session } from "electron";
import { access, mkdir, readFile, rename, rm, stat, writeFile } from "fs/promises";
import { basename, dirname, join, resolve } from "path";

import { applyIndexChange, type IndexChange, type LibraryItem, type LibraryKind, type LibraryPatch } from "./data/libraryIndex";
import { isVideoId, youTubeVideoId } from "./utils/youtube";

export interface ScreenSource {
    id: string;
    name: string;
    thumbnail: string;
    icon: string | null;
}

interface ToolBuild {
    ytDlp: string;
    quickJs: string;
    quickJsHash: string;
}

const LIBRARY_DIR = join(DATA_DIR, "SoundPanel");
const FILES_DIR = join(LIBRARY_DIR, "files");
const INDEX_FILE = join(LIBRARY_DIR, "library.json");
const COVERS_DIR = join(LIBRARY_DIR, "covers");
const TOOLS_DIR = join(LIBRARY_DIR, "tools");
const DOWNLOADS_DIR = join(LIBRARY_DIR, "downloads");

const SOUNDBOARD_URL = /^https:\/\/cdn\.discordapp\.com\/soundboard-sounds\/\d+$/;
const CAPTURE_TYPES: ("screen" | "window")[] = ["screen", "window"];

const QUICKJS_VERSION = "v0.18.0";
const TOOL_BUILDS: Record<string, ToolBuild> = {
    "win32-x64": { ytDlp: "yt-dlp.exe", quickJs: "qjs-windows-x86_64.exe", quickJsHash: "ff03398d74ea6e6bd3a8e58058f7003225abcac229d7d57775b7aaae812a49c7" },
    "win32-ia32": { ytDlp: "yt-dlp_x86.exe", quickJs: "qjs-windows-x86.exe", quickJsHash: "79aa85a8208596dc04333e99726c254d43b9e814803f2100ea593341f2c95b0e" },
    "darwin-arm64": { ytDlp: "yt-dlp_macos", quickJs: "qjs-darwin-arm64", quickJsHash: "91fe89916d3b0a6c01c4dc8382a99c3c1fd91ecfc214aa81ca051902bcce590d" },
    "darwin-x64": { ytDlp: "yt-dlp_macos", quickJs: "qjs-darwin-x86_64", quickJsHash: "fa2c5dc78095daff566b32fab995ced12927875253b84216b91b834af2ef2b74" },
    "linux-x64": { ytDlp: "yt-dlp_linux", quickJs: "qjs-linux-x86_64", quickJsHash: "85ded23b9fabe8c1644fc40a8d2bbdd71157affcbd807359c618cc717ee24d7d" },
    "linux-arm64": { ytDlp: "yt-dlp_linux_aarch64", quickJs: "qjs-linux-aarch64", quickJsHash: "2c005c7171424a598d31c53c8dc4a0ae2e4958eb6fbb37908c885a307c78187c" }
};
const toolBuild: ToolBuild | undefined = TOOL_BUILDS[`${process.platform}-${process.arch}`];

const AUDIO_TYPES: Record<string, string> = { m4a: "audio/mp4", webm: "audio/webm", opus: "audio/ogg", ogg: "audio/ogg", mp3: "audio/mpeg" };

let indexQueue: Promise<unknown> = Promise.resolve();
let pendingSource: { id: string; audio: boolean; at: number; } | null = null;
const SCREEN_PICK_TTL = 10_000;
const sessionsWithHandler = new WeakSet<Session>();
let toolsReady: Promise<void> | undefined;
let ytDlpUpdated = false;
let jsRuntime: Promise<string> | undefined;

interface YouTubeDownload {
    videoId: string;
    folder: string;
    preview?: { title: string; channel?: string; };
    details?: { title?: string; channel?: string; duration?: number; };
    coverSaved: Promise<boolean>;
    cover: boolean;
    startedAt?: number;
    foundAt?: number;
    bar?: BarCourse;
    queued: boolean;
    item?: LibraryItem;
    error?: string;
    finishedAt?: number;
    cancelled?: boolean;
    stop?(): void;
}

interface BarCourse {
    since: number;
    from: number;
    until: number;
    to: number;
    limit: number;
}

const youTubeDownloads = new Map<string, YouTubeDownload>();
const MAX_DOWNLOADS = 3;
let runningDownloads = 0;
const waitingDownloads: (() => void)[] = [];
const FORGET_AFTER = 10 * 60 * 1000;

let lookupTime: number | undefined;
const FETCH_TIME = 800;
const SAVE_TIME = 500;
const LOOKUP_TO = 0.8;
const LOOKUP_LIMIT = 0.92;
const AUDIO_TO = 0.97;
const BAR_END = 0.99;

function checkId(id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid library file id");
    return id;
}

const libraryFilePath = (id: string) => join(FILES_DIR, checkId(id));
const coverFilePath = (id: string) => join(COVERS_DIR, `${checkId(id)}.jpg`);

const isMissing = (err: unknown) => (err as NodeJS.ErrnoException)?.code === "ENOENT";

async function readIfExists(path: string) {
    try {
        return new Uint8Array(await readFile(path));
    } catch (err) {
        if (isMissing(err)) return null;
        throw err;
    }
}

async function readIndexFile(): Promise<LibraryItem[]> {
    try {
        const items = JSON.parse(await readFile(INDEX_FILE, "utf8"));
        return Array.isArray(items) ? items : [];
    } catch (err) {
        if (isMissing(err)) return [];
        throw err;
    }
}

export function readLibraryIndex(_: IpcMainInvokeEvent) {
    return readIndexFile();
}

export async function changeLibraryIndex(_: IpcMainInvokeEvent, change: IndexChange) {
    return changeIndex(cleanChange(change));
}

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isKind = (kind: unknown): kind is LibraryKind => kind === "sound" || kind === "music";
const clampVolume = (volume: number) => Math.min(Math.max(volume, 0), 2);

function cleanItem(raw: Partial<LibraryItem> | null | undefined): LibraryItem {
    if (!raw || typeof raw !== "object" || typeof raw.name !== "string" || !isKind(raw.kind)) throw new Error("Invalid library item");
    const { id, name, kind, mimeType, size, duration, volume, addedAt, artist, youtubeId, cover, favorite } = raw;

    return {
        id: checkId(id as string),
        name: name.slice(0, 200),
        kind,
        mimeType: typeof mimeType === "string" ? mimeType.slice(0, 100) : "",
        size: isFiniteNumber(size) ? size : 0,
        duration: isFiniteNumber(duration) ? duration : 0,
        volume: isFiniteNumber(volume) ? clampVolume(volume) : 1,
        addedAt: isFiniteNumber(addedAt) ? addedAt : Date.now(),
        ...typeof artist === "string" && { artist: artist.slice(0, 200) },
        ...isVideoId(youtubeId) && { youtubeId },
        ...cover === true && { cover },
        ...favorite === true && { favorite }
    };
}

function cleanChange(change: IndexChange): IndexChange {
    switch (change?.type) {
        case "add":
            if (Array.isArray(change.items)) return { type: "add", items: change.items.map(cleanItem) };
            break;
        case "update": {
            const { name, volume, kind, favorite } = change.patch ?? {};
            const patch: LibraryPatch = {};
            if (typeof name === "string") patch.name = name.slice(0, 200);
            if (isFiniteNumber(volume)) patch.volume = clampVolume(volume);
            if (isKind(kind)) patch.kind = kind;
            if (typeof favorite === "boolean") patch.favorite = favorite;
            return { type: "update", id: checkId(change.id), patch };
        }
        case "remove":
            return { type: "remove", id: checkId(change.id) };
    }
    throw new Error("Invalid library change");
}

function changeIndex(change: IndexChange) {
    const task = indexQueue.then(async () => {
        const items = applyIndexChange(await readIndexFile(), change);

        await mkdir(LIBRARY_DIR, { recursive: true });
        await writeFile(`${INDEX_FILE}.tmp`, JSON.stringify(items));
        await rename(`${INDEX_FILE}.tmp`, INDEX_FILE);

        return items;
    });

    indexQueue = task.catch(() => { });
    return task;
}

export async function writeLibraryFile(_: IpcMainInvokeEvent, id: string, data: Uint8Array) {
    if (!(data instanceof Uint8Array)) throw new Error("Invalid file data");
    await mkdir(FILES_DIR, { recursive: true });
    await writeFile(libraryFilePath(id), data);
}

export async function readLibraryFile(_: IpcMainInvokeEvent, id: string) {
    return readIfExists(libraryFilePath(id));
}

export async function readLibraryCover(_: IpcMainInvokeEvent, id: string) {
    return readIfExists(coverFilePath(id));
}

export async function deleteLibraryFile(_: IpcMainInvokeEvent, id: string) {
    await rm(libraryFilePath(id), { force: true });
    await rm(coverFilePath(id), { force: true });
}

export async function downloadSoundboardSound(_: IpcMainInvokeEvent, url: string) {
    if (!SOUNDBOARD_URL.test(url)) throw new Error("Only Discord soundboard sounds can be downloaded");

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed with status ${res.status}`);

    return {
        type: res.headers.get("content-type") ?? "audio/ogg",
        data: new Uint8Array(await res.arrayBuffer())
    };
}

export async function getScreenSources(_: IpcMainInvokeEvent): Promise<ScreenSource[]> {
    const sources = await desktopCapturer.getSources({
        types: CAPTURE_TYPES,
        thumbnailSize: { width: 384, height: 216 },
        fetchWindowIcons: true
    });

    return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        icon: source.appIcon && !source.appIcon.isEmpty() ? source.appIcon.toDataURL() : null
    }));
}

export function selectScreenSource(event: IpcMainInvokeEvent, id: string, audio: boolean) {
    if (typeof id !== "string" || !/^(screen|window):[\w:-]+$/.test(id)) throw new Error("Invalid screen source");
    pendingSource = { id, audio: audio === true, at: Date.now() };

    const { session } = event.sender;
    if (sessionsWithHandler.has(session)) return;
    sessionsWithHandler.add(session);

    session.setDisplayMediaRequestHandler((request, callback) => {
        const choice = pendingSource;
        pendingSource = null;

        if (!choice || Date.now() - choice.at > SCREEN_PICK_TTL) return callback({});

        desktopCapturer.getSources({ types: CAPTURE_TYPES })
            .then(sources => {
                const source = sources.find(s => s.id === choice.id);
                if (!source) return callback({});

                callback({ video: source, audio: choice.audio && request.audioRequested ? "loopback" : undefined });
            })
            .catch(() => callback({}));
    });
}

function getTools() {
    if (!toolBuild) throw new Error("YouTube links don't work on this system");
    return { build: toolBuild, ytDlp: join(TOOLS_DIR, toolBuild.ytDlp), quickJs: join(TOOLS_DIR, toolBuild.quickJs) };
}

const exists = (path: string) => access(path).then(() => true, () => false);

async function download(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Couldn't download ${basename(url)} (status ${res.status})`);
    return Buffer.from(await res.arrayBuffer());
}

async function installTool(path: string, data: Buffer, sha256: string) {
    if (createHash("sha256").update(data).digest("hex") !== sha256) throw new Error(`${basename(path)} doesn't match its checksum`);

    await writeFile(`${path}.tmp`, data, { mode: 0o755 });
    await rename(`${path}.tmp`, path);
}

async function installYtDlp(path: string, file: string) {
    const release = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";
    const [sums, data] = await Promise.all([download(`${release}/SHA2-256SUMS`), download(`${release}/${file}`)]);
    const sha256 = sums.toString("utf8").split("\n").map(line => line.trim().split(/\s+/)).find(([, name]) => name === file)?.[0];
    if (!sha256) throw new Error(`yt-dlp's release has no checksum for ${file}`);

    await installTool(path, data, sha256);
}

function prepareTools() {
    toolsReady ??= (async () => {
        const { build, ytDlp, quickJs } = getTools();
        await mkdir(TOOLS_DIR, { recursive: true });

        if (!await exists(ytDlp)) await installYtDlp(ytDlp, build.ytDlp);
        if (!await exists(quickJs)) {
            const url = `https://github.com/quickjs-ng/quickjs/releases/download/${QUICKJS_VERSION}/${build.quickJs}`;
            await installTool(quickJs, await download(url), build.quickJsHash);
        }
    })().catch(err => {
        toolsReady = undefined;
        throw err;
    });

    return toolsReady;
}

export async function hasYouTubeTools(_: IpcMainInvokeEvent) {
    if (!toolBuild) return false;

    const { ytDlp, quickJs } = getTools();
    return await exists(ytDlp) && await exists(quickJs);
}

export function prepareYouTubeTools(_: IpcMainInvokeEvent) {
    return prepareTools();
}

function ytDlpError(stderr: string) {
    const line = stderr.split(/\r?\n/).filter(l => l.startsWith("ERROR:")).pop();
    return line?.replace(/^ERROR:\s*(\[[^\]]+\]\s*[\w-]+:\s*)?/, "");
}

interface RunOptions {
    onLine?(line: string): void;
    onSpawn?(child: ChildProcess): void;
    cancelled?(): boolean;
}

function runYtDlp(path: string, args: string[], { onLine, onSpawn }: RunOptions = {}) {
    return new Promise<string>((done, fail) => {
        const child = spawn(path, args, {
            windowsHide: true,
            env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" }
        });
        onSpawn?.(child);
        const timeout = setTimeout(() => child.kill(), 5 * 60 * 1000);
        let stdout = "";
        let stderr = "";
        let partialLine = "";

        child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
            stdout += chunk;
            const lines = (partialLine + chunk).split(/\r?\n/);
            partialLine = lines.pop()!;
            if (onLine) lines.forEach(onLine);
        });
        child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });

        child.on("error", err => {
            clearTimeout(timeout);
            fail(err);
        });
        child.on("close", code => {
            clearTimeout(timeout);
            if (code === 0) done(stdout);
            else fail(new Error(ytDlpError(stderr) ?? `yt-dlp stopped with exit code ${code}`));
        });
    });
}

async function runYtDlpUpToDate(path: string, args: string[], options: RunOptions = {}) {
    try {
        return await runYtDlp(path, args, options);
    } catch (err) {
        if (ytDlpUpdated || options.cancelled?.()) throw err;

        ytDlpUpdated = true;
        await runYtDlp(path, ["--update"]).catch(() => { });
        if (options.cancelled?.()) throw err;
        return runYtDlp(path, args, options);
    }
}

function takeDownloadTurn(download: YouTubeDownload) {
    if (runningDownloads < MAX_DOWNLOADS) {
        runningDownloads++;
        return Promise.resolve();
    }

    download.queued = true;
    return new Promise<void>(resolve => waitingDownloads.push(() => {
        download.queued = false;
        resolve();
    }));
}

function giveBackDownloadTurn() {
    const next = waitingDownloads.shift();
    if (next) next();
    else runningDownloads--;
}

function stopIfCancelled(download: YouTubeDownload) {
    if (download.cancelled) throw new Error("Cancelled");
}

function barAt({ since, from, until, to, limit }: BarCourse, now: number) {
    const span = Math.max(until - since, 1);
    if (now <= until) return from + (to - from) * (now - since) / span;

    const late = now - until;
    return to + (limit - to) * late / (late + span);
}

function aimBar(download: YouTubeDownload, until: number, to: number, limit: number) {
    const now = Date.now();
    const from = download.bar ? barAt(download.bar, now) : 0;
    const end = Math.max(limit, from);
    download.bar = { since: now, from, until: Math.max(until, now + 1), to: Math.max(to, from + (end - from) / 2), limit: end };
}

function progressOf(download: YouTubeDownload) {
    if (download.item) return 1;
    return download.bar ? barAt(download.bar, Date.now()) : null;
}

function markFound(download: YouTubeDownload) {
    if (download.startedAt === undefined || download.foundAt !== undefined) return;

    const now = download.foundAt = Date.now();
    const took = now - download.startedAt;
    lookupTime = ((lookupTime ?? took) + took) / 2;
    aimBar(download, now + FETCH_TIME, AUDIO_TO, BAR_END);
}

const thumbnailUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

async function saveCover(videoId: string, id: string) {
    try {
        const image = await download(thumbnailUrl(videoId));
        await mkdir(COVERS_DIR, { recursive: true });
        await writeFile(coverFilePath(id), image);
        return true;
    } catch {
        return false;
    }
}

function getJsRuntime(quickJs: string) {
    return jsRuntime ??= new Promise(resolve => {
        execFile("node", ["--version"], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
            const major = Number(/^v(\d+)\./.exec(String(stdout).trim())?.[1] ?? 0);
            resolve(!err && major >= 20 ? "node" : `quickjs:${quickJs}`);
        });
    });
}

export type VideoLookup =
    | { found: true; title: string; channel?: string; }
    | { found: false; reason: "missing" | "restricted" | "unreachable"; };

async function lookUpVideo(videoId: string): Promise<VideoLookup> {
    try {
        const video = encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);
        const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${video}`);
        if (res.status === 400 || res.status === 404) return { found: false, reason: "missing" };
        if (res.status === 401 || res.status === 403) return { found: false, reason: "restricted" };
        if (!res.ok) return { found: false, reason: "unreachable" };

        const data: { title?: string; author_name?: string; } = await res.json();
        return data.title ? { found: true, title: data.title, channel: data.author_name } : { found: false, reason: "unreachable" };
    } catch {
        return { found: false, reason: "unreachable" };
    }
}

export async function getYouTubePreview(_: IpcMainInvokeEvent, link: string) {
    const videoId = youTubeVideoId(link);
    if (!videoId) throw new Error("That isn't a link to a YouTube video");

    const [video, thumbnail] = await Promise.all([
        lookUpVideo(videoId),
        download(thumbnailUrl(videoId)).then(data => new Uint8Array(data), () => null)
    ]);

    return { videoId, video, thumbnail };
}

function parseLine<T>(line: string): T | undefined {
    try {
        return JSON.parse(line);
    } catch {
        return undefined;
    }
}

async function runYouTubeDownload(id: string, download: YouTubeDownload) {
    await takeDownloadTurn(download);
    try {
        stopIfCancelled(download);
        const { ytDlp, quickJs } = getTools();
        const runtime = await getJsRuntime(quickJs);
        download.startedAt = Date.now();
        lookupTime ??= runtime === "node" ? 4000 : 7500;
        aimBar(download, download.startedAt + lookupTime, LOOKUP_TO, LOOKUP_LIMIT);
        await mkdir(download.folder, { recursive: true });

        const output = await runYtDlpUpToDate(ytDlp, [
            "--ignore-config",
            "--no-playlist",
            "--cache-dir", join(TOOLS_DIR, "cache"),
            "--no-js-runtimes",
            "--js-runtimes", runtime,
            "--format", "bestaudio[acodec=opus]/bestaudio[ext=m4a][audio_channels<=2]/bestaudio[audio_channels<=2]/bestaudio",
            "--max-filesize", "100M",
            "--match-filters", "duration <= 3600",
            "--output", join(download.folder, "audio.%(ext)s"),
            "--progress",
            "--newline",
            "--progress-template", "download:progress %(progress.downloaded_bytes)s %(progress.eta)s",
            "--print", "before_dl:%(.{title,channel,duration})j",
            "--print", "after_move:%(.{title,channel,duration,ext,filepath})j",
            "--", `https://www.youtube.com/watch?v=${download.videoId}`
        ], {
            onLine(line) {
                const progress = /^progress (\d+) (\d+)/.exec(line);
                if (progress) {
                    if (Number(progress[1]) > 0) aimBar(download, Date.now() + Number(progress[2]) * 1000 + SAVE_TIME, AUDIO_TO, BAR_END);
                } else if (line.startsWith("{") && !line.includes("\"filepath\"")) {
                    download.details = parseLine(line);
                    markFound(download);
                }
            },
            onSpawn(child) {
                download.stop = () => child.kill();
            },
            cancelled: () => !!download.cancelled
        });
        stopIfCancelled(download);

        const line = output.trim().split(/\r?\n/).filter(l => l.startsWith("{") && l.includes("\"filepath\"")).pop();
        const info = line && parseLine<{ title?: string; channel?: string; duration?: number; ext?: string; filepath?: string; }>(line);
        if (!info) throw new Error("Only videos up to an hour long and 100 MB can be added");
        if (!info.filepath || dirname(resolve(info.filepath)) !== resolve(download.folder)) throw new Error("yt-dlp saved the audio somewhere unexpected");

        await mkdir(FILES_DIR, { recursive: true });
        await rename(info.filepath, libraryFilePath(id));

        const item: LibraryItem = {
            id,
            name: info.title || download.preview?.title || "YouTube audio",
            kind: "music",
            mimeType: AUDIO_TYPES[info.ext ?? ""] ?? "audio/webm",
            size: (await stat(libraryFilePath(id))).size,
            duration: info.duration ?? 0,
            volume: 1,
            addedAt: Date.now(),
            artist: info.channel,
            youtubeId: download.videoId,
            cover: await download.coverSaved
        };

        stopIfCancelled(download);
        await changeIndex({ type: "add", items: [item] });
        download.item = item;
    } catch (err) {
        download.error = download.cancelled ? "Cancelled" : err instanceof Error ? err.message : String(err);

        await download.coverSaved;
        await Promise.all([rm(libraryFilePath(id), { force: true }), rm(coverFilePath(id), { force: true })]).catch(() => { });
    } finally {
        download.stop = undefined;
        download.finishedAt = Date.now();
        giveBackDownloadTurn();
        await rm(download.folder, { recursive: true, force: true }).catch(() => { });
    }
}

function forgetOldDownloads() {
    const now = Date.now();
    for (const [id, download] of youTubeDownloads) {
        if (download.finishedAt && now - download.finishedAt > FORGET_AFTER) youTubeDownloads.delete(id);
    }
}

export async function startYouTubeDownload(_: IpcMainInvokeEvent, link: string) {
    const videoId = youTubeVideoId(link);
    if (!videoId) throw new Error("That isn't a link to a YouTube video");

    forgetOldDownloads();

    for (const [id, running] of youTubeDownloads) {
        if (running.videoId === videoId && !running.item && !running.error && !running.cancelled) return id;
    }

    await prepareTools();

    const id = randomUUID();
    const download: YouTubeDownload = {
        videoId,
        folder: join(DOWNLOADS_DIR, id),
        coverSaved: saveCover(videoId, id),
        cover: false,
        queued: false
    };
    youTubeDownloads.set(id, download);

    void download.coverSaved.then(saved => { download.cover = saved; });
    void lookUpVideo(videoId).then(video => {
        if (video.found) download.preview = { title: video.title, channel: video.channel };
    });
    void runYouTubeDownload(id, download);

    return id;
}

export function getYouTubeDownload(_: IpcMainInvokeEvent, id: string) {
    const download = youTubeDownloads.get(checkId(id));
    if (!download) return null;

    const { details, preview } = download;
    return {
        title: details?.title || preview?.title,
        channel: details?.channel || preview?.channel,
        duration: details?.duration ?? 0,
        cover: download.cover,
        progress: progressOf(download),
        queued: download.queued,
        item: download.item ?? null,
        error: download.error ?? null
    };
}

export function cancelYouTubeDownload(_: IpcMainInvokeEvent, id: string) {
    const download = youTubeDownloads.get(checkId(id));
    if (!download || download.item || download.error) return;

    download.cancelled = true;
    download.stop?.();
}

export function finishYouTubeDownload(_: IpcMainInvokeEvent, id: string) {
    youTubeDownloads.delete(checkId(id));
}

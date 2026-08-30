/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 .skyade
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { randomUUID } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { access, mkdir, rename, rm } from "node:fs/promises";
import { basename, extname, isAbsolute, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { app, BrowserWindow, dialog, type IpcMainInvokeEvent } from "electron";

const ALLOWED_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);
const MAX_REDIRECTS = 3;
const MAX_FILENAME_LENGTH = 180;
const JOB_RETENTION_MS = 10 * 60 * 1000;
const DIRECTORY_DIALOG_OPTIONS = {
    title: "Choose download folder",
    properties: ["openDirectory", "createDirectory"] as ("openDirectory" | "createDirectory")[],
};

export type DownloadState = "queued" | "downloading" | "completed" | "cancelled" | "failed";

export interface DownloadRequest {
    url: string;
    filename: string;
    directory?: string;
}

export interface DownloadInterceptionOptions {
    directory?: string;
    askEveryTime?: boolean;
}

export interface DownloadStatus {
    id: string;
    filename: string;
    state: DownloadState;
    error?: string;
}

export interface StartedDownload {
    id: string;
    filename: string;
}

type DownloadHandler = (event: Electron.Event, item: Electron.DownloadItem, webContents: Electron.WebContents) => void;

interface DownloadJob extends DownloadStatus {
    controller: AbortController;
    targetPath?: string;
    partialPath?: string;
}

interface DownloadInterceptor {
    directory?: string;
    askEveryTime: boolean;
    webContentsId: number;
    handler: DownloadHandler;
}

const jobs = new Map<string, DownloadJob>();
const reservedTargets = new Set<string>();
const downloadInterceptors = new WeakMap<Electron.Session, DownloadInterceptor>();

function pathKey(path: string) {
    const normalized = resolve(path);
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function assertAllowedAttachmentUrl(rawUrl: string) {
    if (typeof rawUrl !== "string" || rawUrl.length > 4096) {
        throw new Error("Invalid attachment URL");
    }

    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new Error("Invalid attachment URL");
    }

    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname) ||
        (!url.pathname.includes("/attachments/") && !url.pathname.includes("/ephemeral-attachments/"))) {
        throw new Error("Only Discord attachment URLs are supported");
    }

    return url;
}

function filenameFromUrl(url: URL) {
    const rawName = url.pathname.split("/").pop() || "download";
    try {
        return decodeURIComponent(rawName);
    } catch {
        return rawName;
    }
}

function sanitiseFilename(input: string, url: URL) {
    const source = input || filenameFromUrl(url);
    const slashSafe = source.replaceAll("\\", "/");
    let filename = basename(slashSafe)
        .replace(/[<>:"/|?*\u0000-\u001f]/g, "_")
        .trim()
        .replace(/[. ]+$/g, "");

    if (!filename || filename === "." || filename === "..") filename = "download";
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(filename)) filename = `_${filename}`;

    if (filename.length > MAX_FILENAME_LENGTH) {
        const extension = extname(filename);
        filename = `${filename.slice(0, MAX_FILENAME_LENGTH - extension.length)}${extension}`;
    }

    return filename;
}

function resolveDirectory(directory?: string) {
    if (directory == null || (typeof directory === "string" && directory.trim() === "")) {
        return app.getPath("downloads");
    }
    if (typeof directory !== "string") throw new Error("Download directory must be a string");
    if (directory.length > 4096 || !isAbsolute(directory)) {
        throw new Error("Download directory must be an absolute path");
    }

    return resolve(directory);
}

async function targetExists(path: string) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

async function reserveTarget(directory: string, filename: string) {
    const extension = extname(filename);
    const stem = filename.slice(0, filename.length - extension.length);

    for (let index = 0; index < 1000; index++) {
        const candidateName = index === 0 ? filename : `${stem} (${index})${extension}`;
        const candidate = join(directory, candidateName);
        const key = pathKey(candidate);

        if (reservedTargets.has(key) || await targetExists(candidate) || reservedTargets.has(key)) continue;

        reservedTargets.add(key);
        return candidate;
    }

    throw new Error("Could not find an unused filename");
}

function reserveTargetSync(directory: string, filename: string) {
    const extension = extname(filename);
    const stem = filename.slice(0, filename.length - extension.length);

    for (let index = 0; index < 1000; index++) {
        const candidateName = index === 0 ? filename : `${stem} (${index})${extension}`;
        const candidate = join(directory, candidateName);
        const key = pathKey(candidate);

        if (reservedTargets.has(key) || existsSync(candidate)) continue;

        reservedTargets.add(key);
        return candidate;
    }

    throw new Error("Could not find an unused filename");
}

async function fetchAttachment(url: URL, signal: AbortSignal) {
    let currentUrl = url;

    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
        const response = await fetch(currentUrl, {
            redirect: "manual",
            signal,
            headers: { Accept: "*/*" },
        });

        if (response.status < 300 || response.status >= 400) return response;

        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect without a destination");
        currentUrl = assertAllowedAttachmentUrl(new URL(location, currentUrl).toString());
    }

    throw new Error("Too many redirects");
}

function isAbortError(error: unknown) {
    return error instanceof Error && (error.name === "AbortError" || /aborted/i.test(error.message));
}

function publicError(error: unknown) {
    if (error instanceof Error && /^HTTP \d+$/.test(error.message)) return error.message;
    return "Network or filesystem error";
}

function scheduleCleanup(job: DownloadJob) {
    setTimeout(() => jobs.delete(job.id), JOB_RETENTION_MS);
}

function isDownloadRequest(request: unknown): request is DownloadRequest {
    if (!request || typeof request !== "object") return false;

    const candidate = request as Partial<DownloadRequest>;
    return typeof candidate.url === "string" &&
        typeof candidate.filename === "string" &&
        (candidate.directory === undefined || typeof candidate.directory === "string");
}

function watchDownloadItem(job: DownloadJob, item: Electron.DownloadItem) {
    const done = (_event: Electron.Event, state: "completed" | "cancelled" | "interrupted") => {
        job.state = state === "completed" ? "completed" : state === "cancelled" ? "cancelled" : "failed";
        job.error = state === "interrupted" ? "Download interrupted" : undefined;
        if (job.targetPath) reservedTargets.delete(pathKey(job.targetPath));
        scheduleCleanup(job);
    };

    item.once("done", done);
}

function chooseDownloadDirectorySync(webContents: Electron.WebContents) {
    const parent = BrowserWindow.fromWebContents(webContents);
    const filePaths = parent
        ? dialog.showOpenDialogSync(parent, DIRECTORY_DIALOG_OPTIONS)
        : dialog.showOpenDialogSync(DIRECTORY_DIALOG_OPTIONS);

    return filePaths?.[0] ?? null;
}

function handleElectronDownload(interceptor: DownloadInterceptor, item: Electron.DownloadItem, webContents: Electron.WebContents) {
    if (webContents.id !== interceptor.webContentsId) return;

    let url: URL;
    let targetPath: string | undefined;
    try {
        url = assertAllowedAttachmentUrl(item.getURL());
    } catch {
        return;
    }

    try {
        const directory = interceptor.askEveryTime
            ? chooseDownloadDirectorySync(webContents)
            : resolveDirectory(interceptor.directory);
        if (!directory) {
            item.cancel();
            return;
        }

        mkdirSync(directory, { recursive: true });
        const filename = sanitiseFilename(item.getFilename(), url);
        targetPath = reserveTargetSync(directory, filename);
        item.setSavePath(targetPath);

        const job: DownloadJob = {
            id: randomUUID(),
            filename,
            state: "downloading",
            controller: new AbortController(),
            targetPath,
        };

        jobs.set(job.id, job);
        watchDownloadItem(job, item);
    } catch {
        item.cancel();
        if (targetPath) reservedTargets.delete(pathKey(targetPath));
    }
}

async function runDownload(job: DownloadJob, url: URL) {
    job.state = "downloading";

    try {
        const response = await fetchAttachment(url, job.controller.signal);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body || !job.targetPath) throw new Error("Empty response");

        job.partialPath = `${job.targetPath}.${job.id}.part`;

        await pipeline(
            Readable.fromWeb(response.body as unknown as Parameters<typeof Readable.fromWeb>[0]),
            createWriteStream(job.partialPath, { flags: "wx" }),
        );
        await rename(job.partialPath, job.targetPath);

        job.state = "completed";
    } catch (error) {
        job.state = isAbortError(error) ? "cancelled" : "failed";
        job.error = isAbortError(error) ? undefined : publicError(error);

        if (job.partialPath) await rm(job.partialPath, { force: true }).catch(() => { });
    } finally {
        if (job.targetPath) reservedTargets.delete(pathKey(job.targetPath));
        scheduleCleanup(job);
    }
}

export async function chooseDownloadDirectory(event: IpcMainInvokeEvent) {
    const parent = BrowserWindow.fromWebContents(event.sender);
    const result = parent
        ? await dialog.showOpenDialog(parent, DIRECTORY_DIALOG_OPTIONS)
        : await dialog.showOpenDialog(DIRECTORY_DIALOG_OPTIONS);

    return result.canceled ? null : result.filePaths[0] ?? null;
}

export function enableDownloadInterception(event: IpcMainInvokeEvent, options: DownloadInterceptionOptions = {}) {
    const { session } = event.sender;
    const { directory, askEveryTime = false } = options;
    const existing = downloadInterceptors.get(session);
    if (existing) {
        existing.directory = directory;
        existing.askEveryTime = askEveryTime;
        existing.webContentsId = event.sender.id;
        return true;
    }

    const interception = {} as DownloadInterceptor;
    interception.directory = directory;
    interception.askEveryTime = askEveryTime;
    interception.webContentsId = event.sender.id;
    interception.handler = (_event, item, webContents) => handleElectronDownload(interception, item, webContents);
    session.on("will-download", interception.handler);
    downloadInterceptors.set(session, interception);
    return true;
}

export function disableDownloadInterception(event: IpcMainInvokeEvent) {
    const { session } = event.sender;
    const interception = downloadInterceptors.get(session);
    if (!interception) return false;

    session.off("will-download", interception.handler);
    downloadInterceptors.delete(session);
    return true;
}

export async function startDownload(_: IpcMainInvokeEvent, request: DownloadRequest): Promise<StartedDownload> {
    if (!isDownloadRequest(request)) throw new Error("Invalid download request");

    const url = assertAllowedAttachmentUrl(request.url);
    const directory = resolveDirectory(request.directory);
    await mkdir(directory, { recursive: true });

    const filename = sanitiseFilename(request.filename, url);
    const targetPath = await reserveTarget(directory, filename);
    const id = randomUUID();
    const job: DownloadJob = {
        id,
        filename,
        state: "queued",
            controller: new AbortController(),
            targetPath,
    };

    jobs.set(id, job);
    void runDownload(job, url);

    return { id, filename };
}

export function getDownloadStatus(_: IpcMainInvokeEvent, id: string): DownloadStatus | null {
    const job = jobs.get(id);
    if (!job) return null;

    return {
        id: job.id,
        filename: job.filename,
        state: job.state,
        error: job.error,
    };
}

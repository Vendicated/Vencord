/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { sleep } from "@utils/misc";
import type { PluginNative } from "@utils/types";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { decompressFrame, type ParsedFrame,parseGIF } from "gifuct-js";

import { CAPTIONS } from "../captions";
import { measureTextLines } from "../captions/caption";
import type { GifMakerOptions } from "../types";
import { stripDiscordFormatParam } from "./gifPicker";

const MAX_FRAMES = 200;
const INTERNAL_FPS = 30;
const PALETTE_COLORS = 255;
const FETCH_TIMEOUT_MS = 30_000;

const ALLOWED_MEDIA_HOSTS = new Set([
    "cdn.discordapp.com",
    "images-ext-1.discordapp.net",
    "images-ext-2.discordapp.net",
    "media.discordapp.net",
    "media.tenor.com",
    "tenor.com",
    "static.klipy.com",
    "media.giphy.com",
    "media0.giphy.com",
    "media1.giphy.com",
    "media2.giphy.com",
    "media3.giphy.com",
    "media4.giphy.com",
]);

const MediaNative = VencordNative?.pluginHelpers?.gifMaker as PluginNative<typeof import("../native")> | undefined;

const blobUrlMap = new WeakMap<HTMLElement, string>();

function isDiscordCdnUrl(url: string): boolean {
    try {
        return ALLOWED_MEDIA_HOSTS.has(new URL(url).hostname);
    } catch {
        return false;
    }
}

async function fetchFullGifBytes(url: string): Promise<Uint8Array> {
    const resolved = resolveMediaUrl(url);
    if (MediaNative) {
        const { data } = await MediaNative.fetchMedia(resolved);
        return new Uint8Array(data);
    }
    const res = await fetch(resolved, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
}

async function getMediaBlobUrl(url: string): Promise<string> {
    if (MediaNative) {
        const { data, type } = await MediaNative.fetchMedia(url);
        if (data) return URL.createObjectURL(new Blob([data], { type }));
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

const mediaProxyParser = /^https:\/\/(?:images-ext-\d+|cdn)\.discord(?:app|cdn)\.net\/external\/[^/]+\/(?<protocol>https?)\/(?<rest>.+)$/i;

function resolveMediaUrl(url: string): string {
    const normalized = url.startsWith("//") ? `https:${url}` : url;
    const stripped = stripDiscordFormatParam(normalized);
    const match = stripped.match(mediaProxyParser);
    if (match?.groups) {
        const { protocol, rest } = match.groups;
        return `${decodeURIComponent(protocol)}://${decodeURIComponent(rest)}`;
    }
    return stripped;
}

export function cleanupBlobUrl(el: HTMLElement) {
    const blobUrl = blobUrlMap.get(el);
    if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrlMap.delete(el);
    }
}

export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.crossOrigin = "anonymous";

        const resolved = resolveMediaUrl(url);
        if (isDiscordCdnUrl(resolved)) {
            getMediaBlobUrl(resolved).then(blobUrl => {
                blobUrlMap.set(img, blobUrl);
                img.src = blobUrl;
            }).catch(reject);
        } else {
            img.src = resolved;
        }
    });
}

function createVideoElement(src: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
        const v = document.createElement("video");
        v.preload = "auto";
        v.muted = true;
        v.crossOrigin = "anonymous";
        // mount offscreen in the document: chromium skips frame presentation for
        // elements never attached or offscreen, so rvfc/waiting on frames hangs (crbug 40727525)
        v.setAttribute("style", "position:fixed;left:-99999px;top:0;width:1px;height:1px;pointer-events:none;");
        document.body.append(v);

        const timer = setTimeout(() => {
            v.remove();
            reject(new Error("Video load timed out"));
        }, 60_000);

        v.addEventListener("loadedmetadata", () => {
            clearTimeout(timer);
            const { duration, videoWidth, videoHeight } = v;
            if (!isFinite(duration) || duration <= 0 || !videoWidth || !videoHeight) {
                v.remove();
                reject(new Error(`Invalid video: duration=${duration} w=${videoWidth} h=${videoHeight}`));
                return;
            }
            resolve(v);
        }, { once: true });

        v.addEventListener("error", () => {
            clearTimeout(timer);
            v.remove();
            reject(new Error(`Video load failed: ${src} (code=${v.error?.code})`));
        }, { once: true });

        v.src = src;
        v.load();
    });
}

export function loadVideo(url: string): Promise<HTMLVideoElement> {
    const resolved = resolveMediaUrl(url);
    if (isDiscordCdnUrl(resolved)) {
        return getMediaBlobUrl(resolved).then(blobUrl =>
            createVideoElement(blobUrl).then(video => {
                blobUrlMap.set(video, blobUrl);
                return video;
            })
        );
    }
    return createVideoElement(resolved);
}

async function waitForMediaTime(video: HTMLVideoElement, t: number, isCancelled?: () => boolean): Promise<void> {
    // poll playback position instead of presented frames: drawImage reads the
    // decoder's current frame, which never needs compositing (see createVideoElement)
    while (true) {
        if (video.error) throw new Error(`Video failed while playing (code=${video.error.code})`);
        if (isCancelled?.()) throw new Error("Video capture timed out");
        if (video.ended || video.currentTime >= t) return;
        await sleep(15);
    }
}

export function getCaptionHeight(ctx: CanvasRenderingContext2D, width: number, options: GifMakerOptions): number {
    if (options.captionMode === "caption" && options.captionText) {
        const { lines, lineHeight } = measureTextLines(ctx, options.captionText, options.captionSize, options.fontFamily, width - 20);
        return Math.ceil(lines.length * lineHeight + 20);
    }
    return 0;
}

async function encodeFrames(
    width: number,
    height: number,
    options: GifMakerOptions,
    frameCount: number,
    drawFrame: (ctx: CanvasRenderingContext2D, i: number) => void | Promise<void>,
    delays?: number[],
): Promise<Blob> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return new Blob();
    const captionHeight = getCaptionHeight(ctx, width, options);
    const gifHeight = height + captionHeight;
    canvas.width = width;
    canvas.height = gifHeight;

    const defaultDelay = Math.round(1000 / INTERNAL_FPS);

    const frameData: Uint8ClampedArray[] = [];
    for (let i = 0; i < frameCount; i++) {
        ctx.clearRect(0, 0, width, gifHeight);

        ctx.save();
        ctx.translate(0, captionHeight);
        await drawFrame(ctx, i);
        ctx.restore();

        const caption = CAPTIONS.find(c => c.type === options.captionMode);
        if (caption) {
            ctx.save();
            caption.render(ctx, width, captionHeight > 0 ? captionHeight : height, options);
            ctx.restore();
        }

        frameData.push(ctx.getImageData(0, 0, width, gifHeight).data);
        if (i % 20 === 19) await sleep(0);
    }

    // palette from up to 32 evenly spaced frames; the full set doubles peak memory
    const frameLen = width * gifHeight * 4;
    const sampleCount = Math.min(frameCount, 32);
    const samples = new Uint8ClampedArray(sampleCount * frameLen);
    for (let i = 0; i < sampleCount; i++) {
        samples.set(frameData[Math.floor((i * frameCount) / sampleCount)], i * frameLen);
    }

    const palette = quantize(samples, PALETTE_COLORS);
    const gif = GIFEncoder();

    for (let i = 0; i < frameCount; i++) {
        const index = applyPalette(frameData[i], palette);
        gif.writeFrame(index, width, gifHeight, {
            delay: delays ? delays[i] : defaultDelay,
            palette: i === 0 ? palette : undefined,
        });
        if (i % 20 === 19) await sleep(0);
    }

    gif.finish();
    const bytes = gif.bytesView();
    return new Blob([new Uint8Array(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength)], { type: "image/gif" });
}

async function createGifFromImage(url: string, options: GifMakerOptions): Promise<Blob> {
    const img = await loadImage(url);
    try {
        return await encodeFrames(options.width, options.height, options, 1, ctx => {
            ctx.drawImage(img, 0, 0, options.width, options.height);
        });
    } finally {
        cleanupBlobUrl(img);
    }
}

async function createGifFromVideo(url: string, options: GifMakerOptions): Promise<Blob> {
    const video = await loadVideo(url);
    try {
        const { duration } = video;
        const frameCount = Math.max(1, Math.min(
            Math.floor(duration * INTERNAL_FPS),
            MAX_FRAMES
        ));

        const interval = duration / frameCount;
        const delay = Math.round(interval * 1000);
        const delays = new Array(frameCount).fill(delay);

        // seeking throws MEDIA_ERR_DECODE on discord's gif->mp4 transcodes; play through once and sample rendered frames
        const rate = Math.min(16, Math.max(1, duration / 8));
        video.playbackRate = rate;
        let captureTimer: ReturnType<typeof setTimeout> | undefined;
        let cancelled = false;
        let rejectCapture: (err: Error) => void = () => {};
        const captureTimeout = new Promise<never>((_, reject) => { rejectCapture = reject; });
        const captureFail = () => {
            cancelled = true;
            rejectCapture(new Error("Video capture timed out"));
        };
        // encodes can outlast playback, so re-arm the deadline after each sampled frame
        const bumpDeadline = (ms: number) => {
            clearTimeout(captureTimer);
            captureTimer = setTimeout(captureFail, ms);
        };
        bumpDeadline(Math.max(30_000, (duration / rate) * 1000 + 15_000));
        try {
            return await Promise.race([
                (async () => {
                    await video.play();
                    // wait for the first decoded frame so frame 0 isn't blank
                    await waitForMediaTime(video, 0.01, () => cancelled);
                    return encodeFrames(options.width, options.height, options, frameCount, async (ctx, i) => {
                        if (cancelled) throw new Error("Video capture timed out");
                        await waitForMediaTime(video, i * interval, () => cancelled);
                        ctx.drawImage(video, 0, 0, options.width, options.height);
                        bumpDeadline(30_000);
                    }, delays);
                })(),
                captureTimeout,
            ]);
        } finally {
            clearTimeout(captureTimer);
            video.pause();
            video.remove();
        }
    } finally {
        cleanupBlobUrl(video);
    }
}

function hasExt(url: string, ext: string): boolean {
    try {
        const normalized = url.startsWith("//") ? `https:${url}` : url;
        const match = normalized.match(mediaProxyParser);
        const resolved = match?.groups
            ? `${decodeURIComponent(match.groups.protocol)}://${decodeURIComponent(match.groups.rest)}`
            : normalized;
        return new URL(resolved).pathname.toLowerCase().endsWith(ext);
    } catch {
        return url.toLowerCase().endsWith(ext);
    }
}

export async function createGif(url: string, isVideo: boolean, options: GifMakerOptions): Promise<Blob> {
    if (isVideo) return createGifFromVideo(url, options);
    if (hasExt(url, ".gif") || hasExt(url, ".webp")) {
        try {
            return await createGifFromAnimatedImage(url, options);
        } catch (err) {
            if (!(err instanceof Error) || err.message !== "No animated frames found") {
                throw err;
            }
        }
    }
    return createGifFromImage(url, options);
}

function sniffType(bytes: Uint8Array): string | null {
    // mp4 boxes start with a size then "ftyp"; extension-based routing lies when klipy serves mp4 as .gif
    if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return "video/mp4";
    if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
    if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
        && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    return null;
}

type DecodedFrame = { duration: number | null; close(): void; } & CanvasImageSource;

interface ImageDecoderInstance {
    tracks: { ready: Promise<void>; selectedTrack?: { frameCount: number; }; };
    decode(options: { frameIndex: number; }): Promise<{ image: DecodedFrame; }>;
    close(): void;
}

function getImageDecoderCtor(): (new (init: { data: Uint8Array; type: string; }) => ImageDecoderInstance) | undefined {
    const ctor: unknown = (globalThis as { ImageDecoder?: unknown; }).ImageDecoder;
    return typeof ctor === "function"
        ? ctor as new (init: { data: Uint8Array; type: string; }) => ImageDecoderInstance
        : undefined;
}

async function createGifFromDecodableImage(bytes: Uint8Array, type: string, options: GifMakerOptions): Promise<Blob> {
    const Decoder = getImageDecoderCtor();
    if (!Decoder) throw new Error("Unsupported animated image format");
    const decoder = new Decoder({ data: bytes, type });
    try {
        await decoder.tracks.ready;
        const count = Math.min(decoder.tracks.selectedTrack?.frameCount ?? 0, MAX_FRAMES);
        if (count <= 1) throw new Error("No animated frames found");
        const delays: number[] = [];
        // decode one frame at a time inside the draw callback; holding every decoded
        // frame at once can exceed memory on large sources (200 frames ≈ full bitmaps)
        return await encodeFrames(
            options.width, options.height, options, count,
            async (ctx, i) => {
                const frame = (await decoder.decode({ frameIndex: i })).image;
                delays.push(Math.round((frame.duration || 33_333) / 1000)); // VideoFrame.duration is microseconds
                try {
                    ctx.drawImage(frame, 0, 0, options.width, options.height);
                } finally {
                    frame.close();
                }
            },
            delays
        );
    } finally {
        decoder.close();
    }
}

async function createGifFromAnimatedImage(url: string, options: GifMakerOptions): Promise<Blob> {
    const bytes = await fetchFullGifBytes(url);
    const type = sniffType(bytes);
    if (type === "video/mp4") {
        // play the already-downloaded bytes instead of re-downloading
        const blobUrl = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" }));
        try {
            return await createGifFromVideo(blobUrl, options);
        } finally {
            URL.revokeObjectURL(blobUrl);
        }
    }
    if (type === "image/gif") return createGifFromParsedImages(bytes, options);
    if (!type) throw new Error("Unsupported animated image format");
    return createGifFromDecodableImage(bytes, type, options);
}

async function createGifFromParsedImages(bytes: Uint8Array, options: GifMakerOptions): Promise<Blob> {
    const parsedGif = parseGIF(bytes.buffer as ArrayBuffer);
    const gifFrames = parsedGif.frames
        .filter((f): f is Parameters<typeof decompressFrame>[0] => "image" in f && !!f.image)
        .slice(0, MAX_FRAMES);

    if (gifFrames.length <= 1) throw new Error("No animated frames found");

    const gifW = parsedGif.lsd.width;
    const gifH = parsedGif.lsd.height;

    const composite = document.createElement("canvas");
    composite.width = gifW;
    composite.height = gifH;
    const ctx = composite.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Failed to get canvas context for GIF compositing.");

    const patchCanvas = document.createElement("canvas");

    const totalFrames = gifFrames.length;
    const rendered: HTMLCanvasElement[] = [];
    const delays: number[] = [];
    let prev: ParsedFrame | undefined;
    let restoreState: ImageData | null = null;

    for (let i = 0; i < totalFrames; i++) {
        const frame = decompressFrame(gifFrames[i], parsedGif.gct, true);
        delays.push(frame.delay);

        if (prev) {
            if (prev.disposalType === 2) {
                ctx.clearRect(prev.dims.left, prev.dims.top, prev.dims.width, prev.dims.height);
            } else if (prev.disposalType === 3 && restoreState) {
                ctx.putImageData(restoreState, 0, 0);
            }
        }

        if (frame.disposalType === 3) restoreState = ctx.getImageData(0, 0, gifW, gifH);

        const patchData = new ImageData(
            new Uint8ClampedArray(frame.patch),
            frame.dims.width,
            frame.dims.height
        );
        patchCanvas.width = frame.dims.width;
        patchCanvas.height = frame.dims.height;
        const patchCtx = patchCanvas.getContext("2d");
        if (!patchCtx) throw new Error("Failed to get canvas context for patch rendering.");
        patchCtx.putImageData(patchData, 0, 0);
        ctx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

        // snapshot at output size; the encode pass draws each frame 1:1 from here
        const snap = document.createElement("canvas");
        snap.width = options.width;
        snap.height = options.height;
        const snapCtx = snap.getContext("2d");
        if (!snapCtx) throw new Error("Failed to get canvas context for frame snapshot.");
        snapCtx.drawImage(composite, 0, 0, options.width, options.height);
        rendered.push(snap);
        prev = frame;

        if (i % 20 === 19) {
            await sleep(0);
        }
    }

    return await encodeFrames(
        options.width, options.height, options, totalFrames,
        (encodeCtx, i) => {
            encodeCtx.drawImage(rendered[i], 0, 0);
        },
        delays
    );
}

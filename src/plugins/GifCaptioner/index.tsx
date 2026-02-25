/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, closeModal, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import type { CloudUpload } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import {
    Button,
    ChannelStore,
    DraftType,
    ExpressionPickerStore,
    Forms,
    Menu,
    React,
    SelectedChannelStore,
    SelectedGuildStore,
    Toasts,
    UploadHandler,
    showToast,
    useEffect,
    useRef,
    useState
} from "@webpack/common";
import style from "./styles.css?managed";

const logger = new Logger("GifCaptioner");

const CAPTION_FONT = "\"Arial Black\", Impact, sans-serif";
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_FRAME_DELAY_MS = 20;
const MIN_VIDEO_FRAME_STEP = 1 / 50;
const MAX_VIDEO_FRAMES = 260;
const MAX_GIF_FRAMES = 300;
const PREVIEW_MAX_MEDIA_WIDTH = 380;
const PREVIEW_MAX_MEDIA_HEIGHT = 190;

const gifDisplayModule = findByCodeLazy("renderGIF()", "imagePool") as Record<string, unknown>;
const uploadSizeModule = findByCodeLazy("getUserMaxFileSize", "premiumTier") as unknown;
const ActionBarIcon = findByCodeLazy("Children.map", "isValidElement", "dangerous:");

type CaptionTransform = {
    type: "caption";
    text: string;
    size: number;
};

type SpeechBubbleTransform = {
    type: "speechbubble";
    tipX: number;
    tipY: number;
    tipBase: number;
    text: string;
    size: number;
};

type Transform = CaptionTransform | SpeechBubbleTransform;

type MediaKind = "image" | "gif" | "video";

type PreviewMedia = {
    kind: MediaKind;
    url: string;
    width: number;
    height: number;
};

type SourceMedia = PreviewMedia & {
    file?: File;
};

type GifDisplayProps = {
    format?: number;
    src?: string;
};

type ProgressState = {
    status: string;
    progress?: number;
};

type RendererOptions = {
    frames: number;
    width: number;
    height: number;
    transform: Transform;
};

type MessageContextProps = {
    itemHref?: string;
    itemSrc?: string;
    gcMediaType?: string;
};

type ImageContextProps = {
    src?: string;
    href?: string;
    target?: Element;
};

let unpatchGifDisplayRender: (() => void) | null = null;
let lastTab: Transform["type"] = "caption";

function waitNextTick() {
    return new Promise<void>(resolve => setTimeout(resolve));
}

function normalizeDelayMs(delayMs: number) {
    if (!Number.isFinite(delayMs) || delayMs <= 0) return 100;
    return Math.max(MIN_FRAME_DELAY_MS, Math.round(delayMs / 10) * 10);
}

function resolveExport<T>(module: unknown, predicate: (value: unknown) => boolean) {
    if (predicate(module)) return module as T;

    if (module && typeof module === "object") {
        return Object.values(module as Record<string, unknown>).find(predicate) as T | undefined;
    }

    return void 0;
}

function getMaxUploadSize() {
    const guildId = SelectedGuildStore.getGuildId?.() ?? void 0;
    const maxSizeFn = resolveExport<(guildId?: string) => number>(
        uploadSizeModule,
        value => typeof value === "function" && String(value).includes("getUserMaxFileSize")
    );

    if (!maxSizeFn) return DEFAULT_MAX_FILE_SIZE;

    try {
        const value = maxSizeFn(guildId);
        if (Number.isFinite(value) && value > 0) return value;
    } catch (error) {
        logger.error("Failed to resolve max upload size", error);
    }

    return DEFAULT_MAX_FILE_SIZE;
}

function getLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    const safeMaxWidth = Math.max(8, maxWidth);
    const breakToken = (token: string) => {
        if (!token) return [""];
        if (ctx.measureText(token).width <= safeMaxWidth) return [token];

        const chunks: string[] = [];
        let remaining = token;
        while (remaining.length) {
            let lo = 1;
            let hi = remaining.length;
            let best = 1;

            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                const part = remaining.slice(0, mid);
                if (ctx.measureText(part).width <= safeMaxWidth) {
                    best = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }

            chunks.push(remaining.slice(0, best));
            remaining = remaining.slice(best);
        }

        return chunks;
    };

    const raw = (text || "").replace(/\r/g, "");
    if (!raw.trim()) return [""];

    const lines: string[] = [];
    const paragraphs = raw.split("\n");

    for (const paragraph of paragraphs) {
        const words = paragraph.trim().split(/\s+/).filter(Boolean);
        if (!words.length) {
            lines.push("");
            continue;
        }

        let currentLine = "";
        for (const word of words) {
            const parts = breakToken(word);
            for (const part of parts) {
                const candidate = currentLine ? `${currentLine} ${part}` : part;
                if (ctx.measureText(candidate).width <= safeMaxWidth) {
                    currentLine = candidate;
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = part;
                }
            }
        }

        if (currentLine) lines.push(currentLine);
    }

    return lines.length ? lines : [""];
}

function bezierPoint(t: number, start: [number, number], control: [number, number], end: [number, number]): [number, number] {
    const x = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * control[0] + t * t * end[0];
    const y = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * control[1] + t * t * end[1];
    return [x, y];
}

function moveAway(point: [number, number], from: [number, number], distance: number): [number, number] {
    const dx = point[0] - from[0];
    const dy = point[1] - from[1];
    const length = Math.max(1, Math.hypot(dx, dy));
    const scale = distance / length;
    return [point[0] + dx * scale, point[1] + dy * scale];
}

function renderSpeechBubble(ctx: CanvasRenderingContext2D, width: number, height: number, tipX: number, tipY: number, tipBase: number) {
    const start: [number, number] = [0, height * 0.1];
    const control: [number, number] = [width * 0.5, height * 0.2];
    const end: [number, number] = [width, height * 0.1];

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(...start);
    ctx.quadraticCurveTo(...control, ...end);
    ctx.lineTo(width, 0);
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(...start);
    ctx.quadraticCurveTo(...control, ...end);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    const base1 = bezierPoint(Math.min(0.8, Math.max(0, tipBase)), start, control, end);
    const base2 = bezierPoint(Math.min(1, Math.min(0.8, Math.max(0, tipBase)) + 0.2), start, control, end);
    const tip: [number, number] = [tipX, tipY];

    ctx.beginPath();
    ctx.moveTo(...moveAway(base1, tip, 5));
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(...moveAway(base2, tip, 5));
    ctx.fillStyle = "white";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(...base1);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(...base2);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawSpeechBubbleText(ctx: CanvasRenderingContext2D, width: number, height: number, text: string, size: number) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const safeSize = Math.max(8, size);
    ctx.save();
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `${safeSize}px ${CAPTION_FONT}`;

    const lines = getLines(ctx, trimmed, Math.max(20, width - 16));
    const maxTextHeight = height * 0.16;
    const maxLines = Math.max(1, Math.floor(maxTextHeight / safeSize));

    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
        ctx.fillText(lines[i], width / 2, 4 + i * safeSize);
    }
    ctx.restore();
}

class GifRenderer {
    private readonly canvas = document.createElement("canvas");
    private readonly ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
    private readonly encoder = GIFEncoder();

    private readonly width: number;
    private readonly height: number;
    private readonly fullHeight: number;
    private topOffset = 0;
    private speechBubbleCanvas: HTMLCanvasElement | null = null;

    constructor(options: RendererOptions) {
        const maxUploadSize = getMaxUploadSize();
        const estimatedPixels = options.width * options.height * Math.max(1, options.frames);
        const scaleFactor = Math.max(1, Math.sqrt(estimatedPixels / maxUploadSize));

        this.width = Math.max(1, Math.floor(options.width / scaleFactor));
        this.height = Math.max(1, Math.floor(options.height / scaleFactor));

        if (options.transform.type === "caption") {
            const size = Math.max(5, Math.floor(options.transform.size / scaleFactor));
            this.ctx.font = `${size}px ${CAPTION_FONT}`;
            const lines = getLines(this.ctx, options.transform.text, this.width);
            this.topOffset = lines.length * size + 10;
            this.fullHeight = this.topOffset + this.height;
            this.canvas.width = this.width;
            this.canvas.height = this.fullHeight;
            this.ctx.fillStyle = "white";
            this.ctx.fillRect(0, 0, this.width, this.topOffset);
            this.ctx.fillStyle = "black";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "top";
            this.ctx.font = `${size}px ${CAPTION_FONT}`;
            for (let i = 0; i < lines.length; i++) this.ctx.fillText(lines[i], this.width / 2, size * i + 5);
        } else {
            this.fullHeight = this.height;
            this.canvas.width = this.width;
            this.canvas.height = this.fullHeight;
            const speech = document.createElement("canvas");
            speech.width = this.width;
            speech.height = this.height;
            const ctx = speech.getContext("2d");
            if (ctx) {
                renderSpeechBubble(ctx, this.width, this.height, options.transform.tipX / scaleFactor, options.transform.tipY / scaleFactor, options.transform.tipBase);
                drawSpeechBubbleText(
                    ctx,
                    this.width,
                    this.height,
                    options.transform.text,
                    Math.max(8, Math.floor(options.transform.size / scaleFactor))
                );
                this.speechBubbleCanvas = speech;
            }
        }
    }

    addFrame(source: CanvasImageSource, delayMs: number) {
        this.ctx.clearRect(0, this.topOffset, this.width, this.height);
        this.ctx.drawImage(source, 0, this.topOffset, this.width, this.height);
        if (this.speechBubbleCanvas) this.ctx.drawImage(this.speechBubbleCanvas, 0, this.topOffset, this.width, this.height);

        const imageData = this.ctx.getImageData(0, 0, this.width, this.fullHeight).data;
        const palette = quantize(imageData, 256);
        const index = applyPalette(imageData, palette);
        this.encoder.writeFrame(index, this.width, this.fullHeight, { palette, delay: normalizeDelayMs(delayMs) });
    }

    finish() {
        this.encoder.finish();
        return new File([Uint8Array.from(this.encoder.bytesView() as Iterable<number>)], "captioned.gif", { type: "image/gif" });
    }
}

function uploadFile(file: File) {
    const channelId = SelectedChannelStore.getChannelId?.();
    const channel = channelId ? ChannelStore.getChannel(channelId) : null;
    if (!channel) return showToast("No channel selected to upload the GIF.", Toasts.Type.FAILURE);
    UploadHandler.promptToUpload([file], channel, DraftType.ChannelMessage);
}

function replaceDraftUpload(upload: CloudUpload, file: File) {
    try {
        upload.removeFromMsgDraft?.();
    } catch {
        upload.cancel?.();
    }
    uploadFile(file);
}

function formatUrl(rawUrl: string) {
    const url = new URL(rawUrl, location.href);
    url.searchParams.delete("width");
    url.searchParams.delete("height");
    url.searchParams.delete("quality");
    if (url.hostname === "media.discordapp.net") {
        url.searchParams.delete("format");
        url.searchParams.delete("animated");
    }
    return url.toString();
}

function inferKindFromUrl(url: string): MediaKind {
    const path = new URL(url, location.href).pathname.toLowerCase();
    if (/\.(mp4|mov|webm|m4v|ogv)$/.test(path)) return "video";
    if (/\.gif$/.test(path)) return "gif";
    return "image";
}

function inferKindFromFile(file: File): MediaKind {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    if (type.startsWith("video/") || /\.(mp4|mov|webm|m4v|ogv)$/.test(name)) return "video";
    if (type === "image/gif" || /\.gif$/.test(name)) return "gif";
    return "image";
}

function getPreviewDisplayWidth(preview: PreviewMedia) {
    if (!Number.isFinite(preview.width) || !Number.isFinite(preview.height) || preview.width <= 0 || preview.height <= 0) {
        return PREVIEW_MAX_MEDIA_WIDTH;
    }

    const widthByHeight = preview.width * (PREVIEW_MAX_MEDIA_HEIGHT / preview.height);
    return Math.max(1, Math.min(PREVIEW_MAX_MEDIA_WIDTH, preview.width, widthByHeight));
}

function awaitVideoEvent(video: HTMLVideoElement, event: "loadedmetadata" | "canplay" | "seeked") {
    return new Promise<void>((resolve, reject) => {
        const cleanup = () => {
            video.removeEventListener(event, onSuccess);
            video.removeEventListener("error", onError);
        };
        const onSuccess = () => {
            cleanup();
            resolve();
        };
        const onError = () => {
            cleanup();
            reject(new Error(`Video event failed: ${event}`));
        };

        video.addEventListener(event, onSuccess, { once: true });
        video.addEventListener("error", onError, { once: true });
    });
}

async function seekVideo(video: HTMLVideoElement, time: number) {
    const maxSeek = Math.max(0, (video.duration || 0) - 0.001);
    video.currentTime = Math.max(0, Math.min(maxSeek, time));
    await awaitVideoEvent(video, "seeked");
}

function loadImageMetadata(url: string) {
    return new Promise<{ width: number; height: number; }>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve({
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height
        });
        image.onerror = () => reject(new Error("Failed to load image"));
        image.src = url;
    });
}

function loadVideoMetadata(url: string) {
    return new Promise<{ width: number; height: number; }>((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.crossOrigin = "anonymous";
        video.src = url;

        const cleanup = () => {
            video.removeEventListener("loadedmetadata", onLoad);
            video.removeEventListener("error", onError);
        };
        const onLoad = () => {
            cleanup();
            resolve({ width: video.videoWidth, height: video.videoHeight });
        };
        const onError = () => {
            cleanup();
            reject(new Error("Failed to load video"));
        };

        video.addEventListener("loadedmetadata", onLoad, { once: true });
        video.addEventListener("error", onError, { once: true });
    });
}

async function decodeGifFrames(source: SourceMedia) {
    const Decoder = (window as unknown as { ImageDecoder?: any; }).ImageDecoder;
    if (!Decoder) return null;

    const data = source.file
        ? await source.file.arrayBuffer()
        : await fetch(source.url).then(response => {
            if (!response.ok) throw new Error(`Failed to fetch gif: ${response.status}`);
            return response.arrayBuffer();
        });

    const decoder = new Decoder({ data, type: "image/gif" });
    await decoder.tracks?.ready;

    const frameCount = Math.max(1, Number(decoder.tracks?.selectedTrack?.frameCount) || 1);
    const stride = Math.max(1, Math.ceil(frameCount / MAX_GIF_FRAMES));
    const frames: Array<{ bitmap: ImageBitmap; delayMs: number; }> = [];

    for (let i = 0; i < frameCount; i += stride) {
        const decoded = await decoder.decode({ frameIndex: i });
        const frame = decoded.image;
        const bitmap = await createImageBitmap(frame);
        frames.push({ bitmap, delayMs: normalizeDelayMs(((Number(frame.duration) || 100_000) / 1000) * stride) });
        frame.close?.();
    }

    decoder.close?.();
    return frames;
}

async function loadImageAsBitmap(source: SourceMedia) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const imageUrl = source.file ? URL.createObjectURL(source.file) : source.url;

    try {
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("Failed to load image"));
            image.src = imageUrl;
        });
        return await createImageBitmap(image);
    } finally {
        if (source.file) URL.revokeObjectURL(imageUrl);
    }
}

async function renderGif(source: SourceMedia, transform: Transform, progress: ProgressDisplay) {
    const decodedFrames = await decodeGifFrames(source);
    if (!decodedFrames?.length) {
        const bitmap = await loadImageAsBitmap(source);
        const renderer = new GifRenderer({ frames: 1, width: source.width, height: source.height, transform });
        renderer.addFrame(bitmap, 1000);
        bitmap.close();
        return renderer.finish();
    }

    const renderer = new GifRenderer({ frames: decodedFrames.length, width: source.width, height: source.height, transform });
    for (let i = 0; i < decodedFrames.length; i++) {
        progress.update("Rendering", i / decodedFrames.length);
        renderer.addFrame(decodedFrames[i].bitmap, decodedFrames[i].delayMs);
        decodedFrames[i].bitmap.close();
        await waitNextTick();
    }
    return renderer.finish();
}

async function renderImage(source: SourceMedia, transform: Transform) {
    const bitmap = await loadImageAsBitmap(source);
    const renderer = new GifRenderer({ frames: 1, width: source.width, height: source.height, transform });
    renderer.addFrame(bitmap, 1000);
    bitmap.close();
    return renderer.finish();
}

async function renderVideo(source: SourceMedia, transform: Transform, progress: ProgressDisplay) {
    const video = document.createElement("video");
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = source.file ? URL.createObjectURL(source.file) : null;
    const src = objectUrl ?? source.url;

    try {
        video.src = src;
        await awaitVideoEvent(video, "loadedmetadata");
        await awaitVideoEvent(video, "canplay");

        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        if (duration <= 0) throw new Error("Invalid video duration");

        const frameStep = Math.max(MIN_VIDEO_FRAME_STEP, duration / MAX_VIDEO_FRAMES);
        const frameCount = Math.max(1, Math.ceil(duration / frameStep));
        const renderer = new GifRenderer({ frames: frameCount, width: source.width, height: source.height, transform });

        for (let i = 0; i < frameCount; i++) {
            progress.update("Rendering", i / frameCount);
            const current = Math.min(duration, i * frameStep);
            const next = Math.min(duration, (i + 1) * frameStep);
            await seekVideo(video, current);
            renderer.addFrame(video, (next - current) * 1000);
            await waitNextTick();
        }

        return renderer.finish();
    } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
}

async function captionSource(source: SourceMedia, transform: Transform, onDone: (file: File) => void) {
    const progress = new ProgressDisplay("Rendering GIF", "Preparing");
    try {
        const file = source.kind === "video"
            ? await renderVideo(source, transform, progress)
            : source.kind === "gif"
                ? await renderGif(source, transform, progress)
                : await renderImage(source, transform);

        progress.update("Uploading", 1);
        onDone(file);
    } catch (error) {
        logger.error(`Failed to caption ${source.kind}`, error);
        if (source.kind === "video") {
            showToast("Failed to caption video. CSP can block some hosts.", Toasts.Type.FAILURE);
        } else {
            showToast("Failed to caption media.", Toasts.Type.FAILURE);
        }
    } finally {
        progress.close();
    }
}

async function sourceFromUrl(rawUrl: string, explicitKind?: MediaKind): Promise<SourceMedia> {
    const url = formatUrl(rawUrl);
    const kind = explicitKind ?? inferKindFromUrl(url);

    if (kind === "video") {
        const meta = await loadVideoMetadata(url);
        return { kind, url, ...meta };
    }

    const meta = await loadImageMetadata(url);
    return { kind, url, ...meta };
}

async function sourceFromFile(file: File): Promise<SourceMedia> {
    const kind = inferKindFromFile(file);
    const tmpUrl = URL.createObjectURL(file);

    try {
        if (kind === "video") {
            const meta = await loadVideoMetadata(tmpUrl);
            return { kind, url: tmpUrl, ...meta, file };
        }

        const meta = await loadImageMetadata(tmpUrl);
        return { kind, url: tmpUrl, ...meta, file };
    } finally {
        URL.revokeObjectURL(tmpUrl);
    }
}

function CaptionIcon({ size = 22 }: { size?: number; }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}>
            <rect x="5" y="5" width="14" height="10" fill="white" />
            <path d="M18,11H16.5V10.5H14.5V13.5H16.5V13H18V14A1,1 0 0,1 17,15H14A1,1 0 0,1 13,14V10A1,1 0 0,1 14,9H17A1,1 0 0,1 18,10M11,11H9.5V10.5H7.5V13.5H9.5V13H11V14A1,1 0 0,1 10,15H7A1,1 0 0,1 6,14V10A1,1 0 0,1 7,9H10A1,1 0 0,1 11,10M19,4H5C3.89,4 3,4.89 3,6V18A2,2 0 0,0 5,20H19A2,2 0 0,0 21,18V6C21,4.89 20.1,4 19,4Z" />
        </svg>
    );
}

function PreviewMediaView({ preview, width }: { preview: PreviewMedia; width: number; }) {
    const mediaStyle = {
        width: `${Math.round(width)}px`,
        maxWidth: "100%"
    };

    if (preview.kind === "video") {
        return <video src={preview.url} className="vc-gc-preview-media" style={mediaStyle} autoPlay muted loop playsInline />;
    }
    return <img src={preview.url} alt="Media preview" className="vc-gc-preview-media" style={mediaStyle} />;
}

function CaptionPreview({ preview, text, size }: { preview: PreviewMedia; text: string; size: number; }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewWidth = getPreviewDisplayWidth(preview);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = preview.width;
        ctx.font = `${size}px ${CAPTION_FONT}`;
        const lines = getLines(ctx, text || " ", preview.width);
        const captionHeight = Math.max(24, lines.length * size + 10);
        canvas.height = captionHeight;

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, preview.width, captionHeight);
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.font = `${size}px ${CAPTION_FONT}`;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i] || " ", preview.width / 2, size * i + 5);
        }
    }, [preview.width, size, text]);

    return (
        <div className="vc-gc-live-preview" style={{ width: `${Math.round(previewWidth)}px`, maxWidth: "100%" }}>
            <canvas ref={canvasRef} className="vc-gc-caption-canvas" />
            <PreviewMediaView preview={preview} width={previewWidth} />
        </div>
    );
}

function CaptionEditor({ preview, onTransform }: { preview: PreviewMedia; onTransform: (value: CaptionTransform) => void; }) {
    const [text, setText] = useState("");
    const [size, setSize] = useState(Math.max(12, preview.width / 10));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => onTransform({ type: "caption", text, size }), [onTransform, size, text]);
    useEffect(() => inputRef.current?.focus(), []);

    return (
        <div className="vc-gc-editor">
            <CaptionPreview preview={preview} text={text} size={size} />
            <input ref={inputRef} className="vc-gc-caption" placeholder="Enter caption..." value={text} onChange={event => setText(event.target.value)} />
            <label className="vc-gc-range">
                <span>Font size</span>
                <input type="range" min={5} max={200} value={size} onChange={event => setSize(Number.parseFloat(event.target.value))} />
            </label>
        </div>
    );
}

function SpeechBubbleEditor({ preview, onTransform }: { preview: PreviewMedia; onTransform: (value: SpeechBubbleTransform) => void; }) {
    const [tipX, setTipX] = useState(preview.width / 3);
    const [tipY, setTipY] = useState(preview.height / 3);
    const [tipBase, setTipBase] = useState(10);
    const [text, setText] = useState("");
    const [size, setSize] = useState(Math.max(12, preview.width / 12));
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewWidth = getPreviewDisplayWidth(preview);

    useEffect(() => onTransform({
        type: "speechbubble",
        tipX,
        tipY,
        tipBase: tipBase / 100,
        text,
        size
    }), [onTransform, tipBase, tipX, tipY, text, size]);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = preview.width;
        canvas.height = preview.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        renderSpeechBubble(ctx, preview.width, preview.height, tipX, tipY, tipBase / 100);
        drawSpeechBubbleText(ctx, preview.width, preview.height, text, size);
    }, [preview.height, preview.width, tipBase, tipX, tipY, text, size]);

    return (
        <div className="vc-gc-editor">
            <input
                className="vc-gc-caption"
                placeholder="Speech bubble text..."
                value={text}
                onChange={event => setText(event.target.value)}
            />
            <label className="vc-gc-range">
                <span>Font size</span>
                <input
                    type="range"
                    min={5}
                    max={200}
                    value={size}
                    onChange={event => setSize(Number.parseFloat(event.target.value))}
                />
            </label>
            <label className="vc-gc-range">
                <span>Tip base position</span>
                <input type="range" min={0} max={80} value={tipBase} onChange={event => setTipBase(Number.parseFloat(event.target.value))} />
            </label>
            <div className="vc-gc-speech-wrapper" style={{ width: `${Math.round(previewWidth)}px`, maxWidth: "100%" }}>
                <PreviewMediaView preview={preview} width={previewWidth} />
                <canvas
                    ref={canvasRef}
                    className="vc-gc-speech-overlay"
                    onClick={event => {
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        const rect = canvas.getBoundingClientRect();
                        setTipX((event.clientX - rect.left) / rect.width * preview.width);
                        setTipY((event.clientY - rect.top) / rect.height * preview.height);
                    }}
                />
            </div>
        </div>
    );
}

function EditorModal({ preview, onSubmit }: { preview: PreviewMedia; onSubmit: (cb: () => Transform) => void; }) {
    const [tab, setTab] = useState<Transform["type"]>(lastTab);
    const [captionTransform, setCaptionTransform] = useState<CaptionTransform>({ type: "caption", text: "", size: Math.max(12, preview.width / 10) });
    const [speechTransform, setSpeechTransform] = useState<SpeechBubbleTransform>({
        type: "speechbubble",
        tipX: preview.width / 3,
        tipY: preview.height / 3,
        tipBase: 0.1,
        text: "",
        size: Math.max(12, preview.width / 12)
    });

    useEffect(() => {
        onSubmit(() => {
            lastTab = tab;
            return tab === "caption" ? captionTransform : speechTransform;
        });
    }, [captionTransform, onSubmit, speechTransform, tab]);

    return (
        <div className="vc-gc-modal">
            <div className="vc-gc-tabs">
                <button type="button" className={tab === "caption" ? "active" : ""} onClick={() => setTab("caption")}>Caption</button>
                <button type="button" className={tab === "speechbubble" ? "active" : ""} onClick={() => setTab("speechbubble")}>Speech Bubble</button>
            </div>
            {tab === "caption"
                ? <CaptionEditor preview={preview} onTransform={setCaptionTransform} />
                : <SpeechBubbleEditor preview={preview} onTransform={setSpeechTransform} />}
        </div>
    );
}

function openEditorModal(preview: PreviewMedia, onConfirm: (transform: Transform) => void, onClosed?: () => void) {
    let submitCallback: (() => Transform) | null = null;
    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        onClosed?.();
    };

    openModal((modalProps: ModalProps) => (
        <ModalRoot {...modalProps} size={ModalSize.DYNAMIC} className="vc-gc-modal-root">
            <ModalHeader separator={false}>
                <Forms.FormTitle tag="h2">Caption Media</Forms.FormTitle>
            </ModalHeader>
            <ModalContent className="vc-gc-modal-content">
                <EditorModal preview={preview} onSubmit={callback => submitCallback = callback} />
            </ModalContent>
            <ModalFooter>
                <div className="vc-gc-footer-buttons">
                    <Button className="vc-gc-cancel-button" onClick={() => { cleanup(); modalProps.onClose(); }}>Cancel</Button>
                    <Button className="vc-gc-ok-button" onClick={() => { const transform = submitCallback?.(); cleanup(); modalProps.onClose(); if (transform) onConfirm(transform); }}>OK</Button>
                </div>
            </ModalFooter>
        </ModalRoot>
    ));
}

function ProgressModal({ modalProps, title, state, onBind }: { modalProps: ModalProps; title: string; state: ProgressState; onBind: (update: (state: ProgressState) => void) => void; }) {
    const [current, setCurrent] = useState<ProgressState>(state ?? { status: "Preparing" });
    useEffect(() => {
        onBind(next => setCurrent(prev => next ?? prev ?? { status: "Preparing" }));
    }, [onBind]);

    const safe = current ?? { status: "Preparing" };

    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader separator={false}><Forms.FormTitle tag="h2">{title}</Forms.FormTitle></ModalHeader>
            <ModalContent className="vc-gc-progress">
                <div className="vc-gc-progress-status">{safe.status ?? "Preparing"}</div>
                <progress value={safe.progress ?? 0} max={1} />
            </ModalContent>
        </ModalRoot>
    );
}

class ProgressDisplay {
    private updateCallback: ((state: ProgressState) => void) | null = null;
    private readonly modalKey: any;

    constructor(title: string, status: string) {
        this.modalKey = openModal((modalProps: ModalProps) => (
            <ProgressModal modalProps={modalProps} title={title} state={{ status }} onBind={update => this.updateCallback = update} />
        ));
    }

    update(status: string, progress?: number) {
        this.updateCallback?.({ status, progress });
    }

    close() {
        closeModal(this.modalKey);
    }
}

async function openCaptionFlowFromUrl(rawUrl: string, kind?: MediaKind, closePicker = false) {
    try {
        const source = await sourceFromUrl(rawUrl, kind);
        const preview: PreviewMedia = { kind: source.kind, url: source.url, width: source.width, height: source.height };
        openEditorModal(preview, transform => {
            setTimeout(() => {
                try {
                    if (closePicker) ExpressionPickerStore.closeExpressionPicker();
                } catch { }
                void captionSource(source, transform, uploadFile);
            }, 25);
        });
    } catch (error) {
        logger.error("Failed to open caption flow from url", error);
        showToast("Failed to open caption editor for this media.", Toasts.Type.FAILURE);
    }
}

async function openCaptionFlowFromUpload(upload: CloudUpload) {
    try {
        const file = upload.item?.file;
        if (!file || !(file instanceof File)) return showToast("Upload file not available.", Toasts.Type.FAILURE);

        const source = await sourceFromFile(file);
        const previewUrl = URL.createObjectURL(file);
        const preview: PreviewMedia = { kind: source.kind, url: previewUrl, width: source.width, height: source.height };
        openEditorModal(
            preview,
            transform => setTimeout(() => void captionSource(source, transform, gifFile => replaceDraftUpload(upload, gifFile)), 25),
            () => URL.revokeObjectURL(previewUrl)
        );
    } catch (error) {
        logger.error("Failed to open caption flow from upload", error);
        showToast("Failed to open caption editor for attachment.", Toasts.Type.FAILURE);
    }
}

function shouldShowCaptionMenu(url: string, mediaType?: string) {
    if (!url) return false;
    if (mediaType === "img" || mediaType === "video") return true;
    const kind = inferKindFromUrl(url);
    return kind === "image" || kind === "gif" || kind === "video";
}

function messageContextMenuPatch(children: React.ReactNode[], props: MessageContextProps) {
    const url = props.itemHref ?? props.itemSrc;
    if (!url || !shouldShowCaptionMenu(url, props.gcMediaType)) return;
    const group = (findGroupChildrenByChildId("copy-link", children as any) as any[] | undefined) ?? (children as any[]);
    group.push(
        <Menu.MenuItem
            id="vc-gc-caption-message-media"
            label="Caption / Convert to GIF"
            action={() => void openCaptionFlowFromUrl(url, props.gcMediaType === "video" ? "video" : void 0)}
        />
    );
}

function imageContextMenuPatch(children: React.ReactNode[], props: ImageContextProps) {
    if (props.target?.classList?.contains("emoji")) return;
    const url = props.src ?? props.href;
    if (!url || !shouldShowCaptionMenu(url)) return;
    const group = (findGroupChildrenByChildId("copy-native-link", children as any) as any[] | undefined) ?? (children as any[]);
    group.push(
        <Menu.MenuItem
            id="vc-gc-caption-image-context"
            label="Caption / Convert to GIF"
            action={() => void openCaptionFlowFromUrl(url)}
        />
    );
}

function patchGifDisplay() {
    const GifDisplay = resolveExport<{ prototype?: { render?: (...args: any[]) => any; }; }>(
        gifDisplayModule,
        value => typeof value === "function" && !!(value as any).prototype?.renderGIF
    );

    const originalRender = GifDisplay?.prototype?.render;
    if (!originalRender) {
        logger.error("Failed to find GIF display component");
        return showToast("GifCaptioner failed to patch GIF picker.", Toasts.Type.FAILURE);
    }
    if ((originalRender as any).__vcGifCaptionerPatched) return;

    const patchedRender = function (this: { props?: GifDisplayProps; }, ...args: any[]) {
        const rendered = originalRender.apply(this, args);
        if (!this?.props?.src || !rendered?.props) return rendered;

        const trigger = (
            <button
                key="vc-gc-trigger"
                className="vc-gc-trigger"
                type="button"
                onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    const rawUrl = this.props?.src;
                    if (!rawUrl) return;
                    void openCaptionFlowFromUrl(rawUrl, this.props?.format === 1 ? "gif" : "video", true);
                }}
            >
                <CaptionIcon />
            </button>
        );

        const children = rendered.props.children;
        if (Array.isArray(children)) {
            rendered.props.children = children.some(child => child?.key === "vc-gc-trigger")
                ? children
                : [trigger, ...children];
        } else if (children == null) {
            rendered.props.children = [trigger];
        } else {
            rendered.props.children = [trigger, children];
        }
        return rendered;
    };

    (patchedRender as any).__vcGifCaptionerPatched = true;
    GifDisplay.prototype!.render = patchedRender;
    unpatchGifDisplayRender = () => {
        GifDisplay.prototype!.render = originalRender;
    };
}

export default definePlugin({
    name: "GifCaptioner",
    description: "Add captions or speech bubbles to GIFs, videos and images, then send as GIF.",
    authors: [{ name: "AlphaX", id: 1090150575762591746n }],
    managedStyle: style,

    contextMenus: {
        "image-context": imageContextMenuPatch as NavContextMenuPatchCallback,
        "message": messageContextMenuPatch as NavContextMenuPatchCallback
    },

    patches: [
        {
            find: "#{intl::MESSAGE_ACTIONS_MENU_LABEL}),shouldHideMediaOptions:",
            replacement: {
                match: /favoriteableType:\i,(?<=(\i)\.getAttribute\("data-type"\).+?)/,
                replace: (m, target) => `${m}gcMediaType:${target}.getAttribute("data-role"),`
            }
        },
        {
            find: "#{intl::ATTACHMENT_UTILITIES_SPOILER}",
            replacement: {
                match: /(?<=children:\[)(?=.{10,100}tooltip:.{0,150}#{intl::ATTACHMENT_UTILITIES_SPOILER})/,
                replace: "arguments[0].canEdit!==false?$self.UploadCaptionButton(arguments[0]):null,"
            }
        }
    ],

    UploadCaptionButton: ErrorBoundary.wrap(({ upload }: { upload: CloudUpload; }) => {
        const isImage = upload?.item?.file?.type?.startsWith("image/");
        const isVideo = upload?.item?.file?.type?.startsWith("video/");
        if (!isImage && !isVideo) return null;

        return (
            <ActionBarIcon tooltip="Caption and convert to GIF" onClick={() => void openCaptionFlowFromUpload(upload)}>
                <CaptionIcon size={20} />
            </ActionBarIcon>
        );
    }, { noop: true }),

    start() {
        patchGifDisplay();
    },

    stop() {
        unpatchGifDisplayRender?.();
        unpatchGifDisplayRender = null;
    }
});

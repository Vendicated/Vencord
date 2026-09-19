/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getGifRecord,saveGifRecord } from "./db";
import { extractSlugTokens } from "./slug";
import type { Gif, IndexedGifRecord, IndexingProgress, ProgressListener } from "./types";

declare const window: any;

let shouldAbort = false;
let isPaused = false;
let isProcessingQueue = false;

const progressListeners = new Set<ProgressListener>();
const queue: Gif[] = [];
let totalQueueCount = 0;
let completedQueueCount = 0;
let runningThreadCount = 0;

class OcrWorkerPool {
    private pool: any[] = [];
    private waiting: ((worker: any) => void)[] = [];
    private maxWorkers = 3;
    private createdCount = 0;
    private languages = ["eng"];

    setMaxWorkers(count: number) {
        this.maxWorkers = Math.max(1, Math.min(8, count));
    }

    setLanguages(langs: string[]) {
        const sortedNew = [...langs].sort().join(",");
        const sortedOld = [...this.languages].sort().join(",");
        if (sortedNew !== sortedOld) {
            this.languages = [...langs];
            this.terminateAll();
        }
    }

    async acquire(): Promise<any> {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }

        if (this.createdCount < this.maxWorkers) {
            this.createdCount++;
            try {
                const tesseract = await loadTesseractScript();
                const worker = await tesseract.createWorker(
                    this.languages.length === 1 ? this.languages[0] : this.languages
                );
                try {
                    await worker.setParameters({
                        preserve_interword_spaces: "1" as any
                    });
                } catch {}
                return worker;
            } catch (err) {
                this.createdCount--;
                throw err;
            }
        }

        return new Promise(resolve => {
            this.waiting.push(resolve);
        });
    }

    release(worker: any) {
        if (this.waiting.length > 0) {
            const next = this.waiting.shift();
            next?.(worker);
        } else {
            this.pool.push(worker);
        }
    }

    async terminateAll() {
        const all = [...this.pool];
        this.pool = [];
        this.waiting = [];
        this.createdCount = 0;
        for (const w of all) {
            try {
                await w.terminate();
            } catch {}
        }
    }
}

const workerPool = new OcrWorkerPool();

const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function configureOcrLanguages(enableArabic: boolean): void {
    workerPool.setLanguages(enableArabic ? ["eng", "ara"] : ["eng"]);
}

export function isArabicWord(word: string): boolean {
    return ARABIC_PATTERN.test(word);
}

export function splitOcrByLanguage(raw: string): { english: string; arabic: string } {
    if (!raw) return { english: "", arabic: "" };

    const words = raw.split(/\s+/).filter(Boolean);
    const engWords: string[] = [];
    const araWords: string[] = [];

    for (const w of words) {
        if (ARABIC_PATTERN.test(w)) {
            araWords.push(w);
        } else if (/[a-zA-Z0-9]/.test(w)) {
            engWords.push(w);
        }
    }

    return {
        english: engWords.join(" "),
        arabic: araWords.join(" ")
    };
}

export function addProgressListener(listener: ProgressListener): () => void {
    progressListeners.add(listener);
    return () => progressListeners.delete(listener);
}

function notifyProgress(currentUrl: string, isIndexing: boolean): void {
    const progress: IndexingProgress = {
        total: totalQueueCount,
        completed: completedQueueCount,
        currentUrl,
        isIndexing,
        isPaused,
        activeThreads: runningThreadCount
    };
    for (const listener of progressListeners) {
        try {
            listener(progress);
        } catch {}
    }
}

export function togglePauseBackgroundIndexing(): boolean {
    isPaused = !isPaused;
    notifyProgress("", isProcessingQueue);
    return isPaused;
}

export function isIndexingPaused(): boolean {
    return isPaused;
}

async function loadTesseractScript(): Promise<any> {
    if (window.Tesseract) return window.Tesseract;

    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-vencord-ocr="true"]') as HTMLScriptElement;
        if (existing) {
            if (window.Tesseract) return resolve(window.Tesseract);
            existing.addEventListener("load", () => resolve(window.Tesseract));
            existing.addEventListener("error", reject);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
        script.async = true;
        script.setAttribute("data-vencord-ocr", "true");
        script.onload = () => resolve(window.Tesseract);
        script.onerror = () => reject(new Error("Failed to load Tesseract.js"));
        document.head.appendChild(script);
    });
}

export async function terminateOcrWorker(): Promise<void> {
    await workerPool.terminateAll();
}

async function getMediaDataUrl(src: string): Promise<string> {
    try {
        const nativeHelper = window.VencordNative?.pluginHelpers?.GifLens;
        if (nativeHelper?.fetchMediaBase64) {
            const data = await nativeHelper.fetchMediaBase64(src);
            if (data) return data;
        }
    } catch {}

    return src;
}

function calculateTargetDimensions(srcWidth: number, srcHeight: number): { width: number; height: number } {
    let w = srcWidth;
    let h = srcHeight;

    if (!w || !h || w < 20 || h < 20) {
        return { width: 0, height: 0 };
    }

    if (w < 600 && h < 600) {
        const scale = Math.min(2.5, 900 / Math.max(w, h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);
    } else if (w > 1400 || h > 1400) {
        const scale = 1400 / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
    }

    return { width: w, height: h };
}

function captureVideoFrame(src: string, targetPercent = 0.4): Promise<HTMLCanvasElement | null> {
    return new Promise(resolve => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.preload = "auto";
        video.playsInline = true;

        let finished = false;
        const cleanup = () => {
            if (finished) return;
            finished = true;
            video.onloadedmetadata = null;
            video.onseeked = null;
            video.onerror = null;
            video.src = "";
            video.remove();
        };

        const timer = setTimeout(() => {
            cleanup();
            resolve(null);
        }, 3500);

        video.onloadedmetadata = () => {
            try {
                const dur = video.duration || 1;
                video.currentTime = Math.max(0.05, Math.min(dur * targetPercent, dur - 0.05));
            } catch {
                video.currentTime = 0.2;
            }
        };

        video.onseeked = () => {
            clearTimeout(timer);
            try {
                const { width: w, height: h } = calculateTargetDimensions(video.videoWidth, video.videoHeight);
                if (!w || !h) {
                    cleanup();
                    return resolve(null);
                }

                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");

                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                    ctx.drawImage(video, 0, 0, w, h);
                    cleanup();
                    resolve(canvas);
                } else {
                    cleanup();
                    resolve(null);
                }
            } catch {
                cleanup();
                resolve(null);
            }
        };

        video.onerror = () => {
            clearTimeout(timer);
            cleanup();
            resolve(null);
        };

        video.src = src;
    });
}

function captureImageFrame(src: string): Promise<HTMLCanvasElement | null> {
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        let finished = false;
        const cleanup = () => {
            if (finished) return;
            finished = true;
            img.onload = null;
            img.onerror = null;
        };

        const timer = setTimeout(() => {
            cleanup();
            resolve(null);
        }, 3000);

        img.onload = () => {
            clearTimeout(timer);
            try {
                const { width: w, height: h } = calculateTargetDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height);
                if (!w || !h) {
                    cleanup();
                    return resolve(null);
                }

                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");

                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                    ctx.drawImage(img, 0, 0, w, h);
                    cleanup();
                    resolve(canvas);
                } else {
                    cleanup();
                    resolve(null);
                }
            } catch {
                cleanup();
                resolve(null);
            }
        };

        img.onerror = () => {
            clearTimeout(timer);
            cleanup();
            resolve(null);
        };

        img.src = src;
    });
}

function enhanceCanvasContrast(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d");
    if (!ctx) return sourceCanvas;

    ctx.drawImage(sourceCanvas, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    let minLum = 255;
    let maxLum = 0;

    for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
    }

    const range = maxLum - minLum || 1;

    for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const normalized = Math.min(255, Math.max(0, ((lum - minLum) / range) * 255));
        d[i] = normalized;
        d[i + 1] = normalized;
        d[i + 2] = normalized;
    }

    ctx.putImageData(imgData, 0, 0);
    return out;
}

function cleanOcrText(raw: string): string {
    if (!raw) return "";

    const sanitized = raw
        .replace(/[\u064B-\u0652\u0640]/g, "")
        .replace(/[^a-zA-Z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s'-]/g, " ");

    const tokens = sanitized.split(/\s+/).filter(Boolean);
    const validWords: string[] = [];

    for (const token of tokens) {
        if (ARABIC_PATTERN.test(token)) {
            const cleanedAra = token.replace(/[^\u0621-\u064A\u0660-\u06690-9-]/g, "");
            if (cleanedAra.length >= 2 || (cleanedAra.length === 1 && /^[\u0648\u0641]$/.test(cleanedAra))) {
                validWords.push(cleanedAra);
            }
        } else {
            const lower = token.toLowerCase().replace(/[^a-z0-9'-]/g, "");
            if (lower.length > 1) {
                if (lower.length === 2 && !/^(ai|in|on|at|to|no|is|it|he|we|go|do|me|my|up|so|or|an|as|by|if|of)$/.test(lower)) {
                    continue;
                }
                validWords.push(lower);
            }
        }
    }

    return Array.from(new Set(validWords)).join(" ");
}

export async function extractTextFromMedia(url: string, src?: string, deepScan = false, enableArabic = false): Promise<string> {
    configureOcrLanguages(enableArabic);
    const rawTarget = src || url;
    if (!rawTarget) return "";

    const targetUrl = await getMediaDataUrl(rawTarget);
    const isVideo = targetUrl.startsWith("data:video/") || /\.(mp4|webm)(\?.*)?$/i.test(rawTarget);

    let canvas: HTMLCanvasElement | null = null;
    try {
        canvas = isVideo ? await captureVideoFrame(targetUrl, 0.35) : await captureImageFrame(targetUrl);
    } catch {
        canvas = null;
    }

    if (!canvas && src && url && src !== url) {
        try {
            const fallbackUrl = await getMediaDataUrl(url);
            canvas = await captureImageFrame(fallbackUrl);
        } catch {
            canvas = null;
        }
    }

    if (!canvas || canvas.width < 20 || canvas.height < 20) {
        return "";
    }

    let worker: any = null;
    try {
        worker = await workerPool.acquire();

        const enhancedCanvas = enhanceCanvasContrast(canvas);
        const resPrimary = await worker.recognize(enhancedCanvas);
        const primaryText = cleanOcrText(resPrimary?.data?.text ?? "");

        let secondaryText = "";
        if (isVideo && deepScan) {
            const lateCanvas = await captureVideoFrame(targetUrl, 0.7);
            if (lateCanvas) {
                const lateEnhanced = enhanceCanvasContrast(lateCanvas);
                const resSecondary = await worker.recognize(lateEnhanced);
                secondaryText = cleanOcrText(resSecondary?.data?.text ?? "");
            }
        }

        const combined = Array.from(
            new Set([...primaryText.split(/\s+/), ...secondaryText.split(/\s+/)])
        ).filter(w => w.length > 1).join(" ");

        return combined || primaryText;
    } catch {
        return "";
    } finally {
        if (worker) {
            workerPool.release(worker);
        }
    }
}

export async function indexGif(gif: Gif, enableOcr = true, deepScan = false, enableArabic = false): Promise<IndexedGifRecord> {
    const existing = await getGifRecord(gif.url);
    if (existing && (existing.ocrText || !enableOcr)) {
        return existing;
    }

    const slugTokens = extractSlugTokens(gif.url, gif.src);
    let ocrText = existing?.ocrText ?? "";

    if (enableOcr && !ocrText) {
        try {
            ocrText = await extractTextFromMedia(gif.url, gif.src, deepScan, enableArabic);
        } catch {}
    }

    const record: IndexedGifRecord = {
        url: gif.url,
        src: gif.src,
        ocrText,
        slugTokens,
        timestamp: Date.now()
    };

    await saveGifRecord(record);
    return record;
}

export function startBackgroundIndexing(gifs: Gif[], enableOcr = true, concurrency = 3, deepScan = false, enableArabic = false): void {
    if (shouldAbort) shouldAbort = false;
    configureOcrLanguages(enableArabic);
    workerPool.setMaxWorkers(concurrency);

    let added = false;
    for (const gif of gifs) {
        if (!queue.some(g => g.url === gif.url)) {
            queue.push(gif);
            added = true;
        }
    }

    if (!added && queue.length === 0) {
        completedQueueCount = 0;
        totalQueueCount = 0;
        notifyProgress("", false);
        return;
    }

    totalQueueCount = queue.length + completedQueueCount;

    if (!isProcessingQueue) {
        processQueue(enableOcr, concurrency, deepScan, enableArabic);
    }
}

async function processQueue(enableOcr: boolean, concurrency: number, deepScan = false, enableArabic = false): Promise<void> {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    const actualConcurrency = Math.max(1, Math.min(6, concurrency));
    const workerPromises: Promise<void>[] = [];

    for (let i = 0; i < actualConcurrency; i++) {
        workerPromises.push(
            (async () => {
                runningThreadCount++;
                while (queue.length > 0 && !shouldAbort) {
                    if (isPaused) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                        continue;
                    }

                    const gif = queue.shift();
                    if (!gif) break;

                    notifyProgress(gif.url, true);

                    try {
                        await indexGif(gif, enableOcr, deepScan, enableArabic);
                    } catch {}

                    completedQueueCount++;
                    notifyProgress(gif.url, true);

                    await new Promise(resolve => setTimeout(resolve, 20));
                }
                runningThreadCount = Math.max(0, runningThreadCount - 1);
            })()
        );
    }

    await Promise.all(workerPromises);
    isProcessingQueue = false;

    if (queue.length === 0) {
        totalQueueCount = 0;
        completedQueueCount = 0;
        notifyProgress("", false);
    }
}

export function stopBackgroundIndexing(): void {
    shouldAbort = true;
    queue.length = 0;
    totalQueueCount = 0;
    completedQueueCount = 0;
    isProcessingQueue = false;
    isPaused = false;
    notifyProgress("", false);
}

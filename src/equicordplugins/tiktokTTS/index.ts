/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { playAudio } from "@api/AudioPlayer";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, React } from "@webpack/common";

// Same worker used by vcNarratorCustom; returns raw base64 audio when base64=true.
const API_BASE = "https://tiktok-tts-aio.exampleuser.workers.dev";

const TEXT_CHUNK_LIMIT_BYTES = 300;
const TEXT_TOTAL_LIMIT_BYTES = 2000;
const MAX_CHUNKS = 10;
const encoder = new TextEncoder();

const settings = definePluginSettings({
    volume: {
        type: OptionType.SLIDER,
        description: "Playback volume",
        default: 50,
        markers: [0, 25, 50, 75, 100],
        stickToMarkers: false,
    },
});

function extractBase64(body: string): string | null {
    try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed.data === "string") return parsed.data; // legacy JSON shape
    } catch {
        /* not JSON, fall through */
    }
    const trimmed = body.trim();
    return trimmed.length > 0 ? trimmed : null;
}

async function readOutTextChunk(text: string): Promise<void> {
    const payload = { text, voice: "en_us_001", base64: true };
    const volume = Math.max(0, Math.min(100, settings.store.volume ?? 50));

    const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        console.error("TiktokTTS: API request failed", res.status, res.statusText);
        return;
    }

    const body = await res.text();
    const base64 = extractBase64(body);
    if (!base64) {
        console.error("TiktokTTS: missing base64 audio in response");
        return;
    }

    await new Promise<void>(resolve => {
        let resolved = false;
        const done = () => {
            if (resolved) return;
            resolved = true;
            resolve();
        };

        const player = playAudio(`data:audio/mpeg;base64,${base64}`, {
            volume,
            onEnded: done,
            onError: () => done(),
        });

        // Safety valve: if onEnded doesn't fire, resolve after a duration-based timeout.
        // tried a fixed 15s timeout during testing, fixed timeout can cause overlapped audio with the chunking.
        let timeoutHandle = setTimeout(done, 30000);
        void (async () => {
            try {
                const duration = await player.duration;
                if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
                    clearTimeout(timeoutHandle);
                    // Add a small buffer; cap to avoid hanging forever.
                    const ms = Math.max(15000, Math.min(120000, Math.ceil((duration + 1) * 1000)));
                    timeoutHandle = setTimeout(done, ms);
                }
            } catch {
                // keep default timeout
            }
        })();
    });
}

function sliceByBytes(text: string, limit: number): string[] {
    const parts: string[] = [];
    let start = 0;
    while (start < text.length) {
        let end = text.length;
        // Shrink until byte length fits the limit.
        while (end > start) {
            const candidate = text.slice(start, end);
            if (encoder.encode(candidate).length <= limit) {
                parts.push(candidate);
                start = end;
                break;
            }
            end--;
        }
        if (end === start) break; // safety
    }
    return parts;
}

function chunkTextByBytes(text: string): string[] {
    const totalBytes = encoder.encode(text).length;
    if (totalBytes === 0) return [];
    if (totalBytes > TEXT_TOTAL_LIMIT_BYTES) {
        console.warn("TiktokTTS: text exceeds 2000-byte limit; truncating to fit");
        text = new TextDecoder().decode(encoder.encode(text).slice(0, TEXT_TOTAL_LIMIT_BYTES));
    }

    const chunks: string[] = [];
    const words = text.split(/\s+/).filter(Boolean);
    let current = "";

    const pushChunk = (chunk: string) => {
        if (!chunk) return;
        if (chunks.length >= MAX_CHUNKS) return;
        chunks.push(chunk);
    };

    const flush = () => {
        const trimmed = current.trim();
        if (!trimmed) {
            current = "";
            return;
        }
        pushChunk(trimmed);
        current = "";
    };

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (encoder.encode(candidate).length <= TEXT_CHUNK_LIMIT_BYTES) {
            current = candidate;
            continue;
        }

        // Current + word would overflow; flush current first.
        flush();

        // If the single word itself is too big, hard-split it by bytes.
        if (encoder.encode(word).length > TEXT_CHUNK_LIMIT_BYTES) {
            for (const part of sliceByBytes(word, TEXT_CHUNK_LIMIT_BYTES)) {
                pushChunk(part);
                if (chunks.length >= MAX_CHUNKS) break;
            }
            current = "";
            if (chunks.length >= MAX_CHUNKS) break;
            continue;
        }

        current = word;
        if (chunks.length >= MAX_CHUNKS) break;
    }

    flush();
    return chunks;
}

const jobQueue: string[] = [];
let processing = false;

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }) => {
    if (!message?.content || message.content.length === 0) return;

    // Put it in the bottom section of the context menu.
    if (children.some(c => c?.props?.id === "tiktok-tts-play")) return;

    children.push(React.createElement(Menu.MenuItem, {
        id: "tiktok-tts-play",
        label: "Play TikTok TTS",
        action: () => enqueueRead(message.content),
    }));
};

function enqueueRead(text: string) {
    jobQueue.push(text);
    void processQueue();
}

async function processQueue() {
    if (processing) return;
    processing = true;
    while (jobQueue.length > 0) {
        const nextMessage = jobQueue.shift();
        if (!nextMessage) break;

        for (const chunk of chunkTextByBytes(nextMessage)) {
            await readOutTextChunk(chunk);
            await new Promise(res => setTimeout(res, 120)); // shorter pacing between clips
        }
    }
    processing = false;
}

export default definePlugin({
    name: "TiktokTTS",
    description: "Adds a context menu option to read out chat messages with the good ol' Tiktok TTS voice :sob:",
    authors: [EquicordDevs.VillainsRule, EquicordDevs.examplegit],
    dependencies: ["AudioPlayerAPI"],
    settings,
    contextMenus: {
        "message": messageCtxPatch,
    },
});

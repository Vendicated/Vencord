/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { NativeAudio } from "./discordAudio";
import type { TrackInfo } from "./player";

export const hasSource = (element: HTMLMediaElement) => element.hasAttribute("src") || !!element.querySelector("source[src]");
export const isAtEnd = (time: number, duration: number) => duration > 0 && time >= duration - 0.25;

export function readSnapshot(element: HTMLMediaElement) {
    return {
        currentTime: element.currentTime,
        playbackRate: element.playbackRate,
        preservesPitch: element.preservesPitch,
        volume: element.volume,
        muted: element.muted,
        paused: element.paused,
        ended: element.ended
    };
}

type NativeTrackContext = Pick<NativeAudio, "src" | "message" | "attachment" | "kind" | "playbackCacheKey">;

export function resolveTrack({ src, message, attachment, kind, playbackCacheKey }: NativeTrackContext): TrackInfo {
    const isVoiceMessage = kind === "voice";
    return {
        src,
        title: isVoiceMessage ? "Voice Message" : attachment.filename || "Audio File",
        author: message.author?.username ?? "",
        channelId: message.channel_id,
        messageId: message.id,
        attachmentId: attachment.id,
        playbackCacheKey,
        fallbackDuration: attachment.duration_secs ?? 0
    };
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "@plugins/soundPanel.desktop/settings";
import { logger } from "@plugins/soundPanel.desktop/utils/logger";

interface VideoQuality {
    width: number;
    height: number;
    framerate?: number;
}

interface QualityOverwrite {
    encode: VideoQuality;
    capture: VideoQuality;
    bitrateMax: number;
    bitrateMin: number;
}

interface StreamParameter {
    quality?: number;
    maxBitrate?: number;
    maxFrameRate?: number;
    maxResolution?: { type: unknown; width?: number; height?: number; };
}

interface WebRTCConnection {
    context: string;
    input?: { getVideoStream?(): MediaStream | null | undefined; };
    videoQualityManager: {
        goliveMaxQuality?: { bitrateMax?: number; };
        qualityOverwrite?: QualityOverwrite;
        setGoliveQuality(quality: { encode: VideoQuality; capture: VideoQuality; bitrateMax: number; }): void;
        setQualityOverwrite(quality: QualityOverwrite | undefined): void;
    };
    videoStreamParameters: StreamParameter[];
}

const SDP_BITRATE_KBPS = 2500;
const CAMERA_BITRATE = { min: 2_500_000, max: 6_000_000 };
const STREAM_BITRATE_MAX = 9_000_000;

const maxQuality = () => settings.store.maxVideoQuality;

const readConstraint = (value: unknown) =>
    typeof value === "number" ? value : (value as ConstrainDoubleRange | undefined)?.ideal ?? (value as ConstrainDoubleRange | undefined)?.max;

export function syncGoLiveQuality(connection: WebRTCConnection, constraints: MediaTrackConstraints, highBitrate: number, lowBitrate: number) {
    try {
        const width = readConstraint(constraints.width);
        const height = readConstraint(constraints.height);
        const framerate = readConstraint(constraints.frameRate);
        if (!width || !height) return;

        const bitrateMax = height > 720 || (framerate ?? 0) > 30 ? highBitrate : lowBitrate;
        const quality = { width, height, framerate };
        connection.videoQualityManager.setGoliveQuality({ encode: quality, capture: quality, bitrateMax });

        const params = connection.videoStreamParameters;
        const main = params[Math.max(0, params.findIndex(p => p.quality === 100))];
        if (!main) return;

        main.maxResolution = { ...main.maxResolution!, width, height };
        if (framerate) main.maxFrameRate = framerate;
        main.maxBitrate = bitrateMax;
    } catch (err) {
        logger.error("Failed to sync the stream quality", err);
    }
}

export function applyMaxVideoQuality(connection: WebRTCConnection) {
    try {
        const manager = connection.videoQualityManager;
        if (!maxQuality()) {
            if (manager.qualityOverwrite) manager.setQualityOverwrite(undefined);
            return;
        }

        const track = connection.input?.getVideoStream?.()?.getVideoTracks()[0];
        if (track?.readyState !== "live") return;

        const { width, height, frameRate } = track.getSettings();
        if (!width || !height) return;

        const framerate = Math.round(frameRate || 30);
        const bitrateMax = connection.context === "stream"
            ? STREAM_BITRATE_MAX
            : Math.min(CAMERA_BITRATE.max, Math.max(CAMERA_BITRATE.min, Math.round(width * height * framerate * 0.1)));

        const quality = { width, height, framerate };
        manager.setQualityOverwrite({ encode: quality, capture: quality, bitrateMax, bitrateMin: Math.round(bitrateMax / 4) });
    } catch (err) {
        logger.error("Failed to apply max video quality", err);
    }
}

export function getVideoBitrateKbps(connection: Partial<WebRTCConnection> | undefined) {
    let bitrate: number | undefined;

    if (connection?.context === "stream") {
        bitrate = maxQuality() ? STREAM_BITRATE_MAX : connection.videoQualityManager?.goliveMaxQuality?.bitrateMax;
    } else if (connection?.context === "default" && maxQuality()) {
        bitrate = CAMERA_BITRATE.max;
    }

    return bitrate ? Math.max(SDP_BITRATE_KBPS, Math.round(bitrate / 1000)) : SDP_BITRATE_KBPS;
}

export function getStartBitrateParam(maxBitrateKbps: number) {
    return maxBitrateKbps > SDP_BITRATE_KBPS ? `;x-google-start-bitrate=${SDP_BITRATE_KBPS}` : "";
}

export function upgradeCameraConstraints(constraints: MediaStreamConstraints | undefined) {
    if (!constraints?.video || !maxQuality()) return constraints;

    const video = typeof constraints.video === "object" ? constraints.video : {};
    return {
        ...constraints,
        video: { ...video, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } }
    };
}

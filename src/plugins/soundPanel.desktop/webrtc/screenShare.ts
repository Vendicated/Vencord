/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { logger, showError } from "@plugins/soundPanel.desktop/utils/logger";
import { Native } from "@plugins/soundPanel.desktop/utils/native";
import { MediaEngineStore } from "@webpack/common";

import { pickScreenSource, type ScreenShareChoice } from "./SourcePicker";

interface GoLiveSource {
    desktopDescription: {
        id: string;
        soundshareId?: number | null;
        useLoopback?: boolean;
    };
    quality?: { resolution?: number; frameRate?: number; };
}

interface WebRTCEngine {
    getDesktopSource(constraints: MediaTrackConstraints, audio: boolean): Promise<string>;
    setGoLiveSource(source: GoLiveSource, context: string): void;
}

interface CaptureOptions {
    preset?: number;
    resolution?: number;
    frameRate?: number;
    audio?: boolean;
}

interface CapturedInput extends CaptureOptions {
    sourceId: string;
}

const PRESET_DOCUMENTS = 2;

let originalGetDisplayMedia: MediaDevices["getDisplayMedia"] | null = null;
let pendingCapture: ScreenShareChoice & { contentHint: string; } | null = null;
const capturedInputs = new Map<string, CapturedInput>();
const capturing = new Set<string>();
let qualityChangeTimer: ReturnType<typeof setTimeout> | undefined;

const isElectronSourceId = (id: unknown): id is string => typeof id === "string" && /^(screen|window):/.test(id);

export function installScreenShareHook() {
    const devices = navigator.mediaDevices;
    if (!Native || !devices?.getDisplayMedia || originalGetDisplayMedia) return;

    const original = originalGetDisplayMedia = devices.getDisplayMedia;

    devices.getDisplayMedia = async function (constraints = {}) {
        const choice = pendingCapture ?? await pickScreenSource(!!constraints.audio);
        const contentHint = pendingCapture?.contentHint ?? "motion";
        pendingCapture = null;
        if (!choice) throw new DOMException("Screen share was cancelled", "NotAllowedError");

        await Native!.selectScreenSource(choice.id, choice.audio);

        const audio = choice.audio && constraints.audio
            ? { ...(typeof constraints.audio === "object" ? constraints.audio : {}), restrictOwnAudio: true }
            : false;

        const stream = await original.call(this, { ...constraints, audio } as DisplayMediaStreamOptions);

        stream.getVideoTracks().forEach(track => track.contentHint = contentHint);
        return stream;
    };
}

export function uninstallScreenShareHook() {
    if (!originalGetDisplayMedia) return;

    navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
    originalGetDisplayMedia = null;
}

function getCaptureConstraints({ resolution, frameRate }: CaptureOptions) {
    const height = resolution || Math.round(screen.height * devicePixelRatio);
    const width = Math.round(height * screen.width / screen.height);
    const fps = frameRate || 30;

    return {
        width: { ideal: width, max: width },
        height: { ideal: height, max: height },
        frameRate: { ideal: fps, max: fps }
    };
}

async function capture(engine: WebRTCEngine, sourceId: string, options: CaptureOptions) {
    const constraints = getCaptureConstraints(options);
    logger.info(`Capturing ${sourceId} at ${constraints.width.max}x${constraints.height.max}, ${constraints.frameRate.max} FPS`);

    pendingCapture = {
        id: sourceId,
        audio: !!options.audio,
        contentHint: options.preset === PRESET_DOCUMENTS ? "detail" : "motion"
    };

    try {
        const inputId = await engine.getDesktopSource(constraints, !!options.audio);
        capturedInputs.set(inputId, { ...options, sourceId });
        return inputId;
    } finally {
        pendingCapture = null;
    }
}

function reportCaptureError(err: unknown) {
    showError("Couldn't capture the screen or window to stream", err);
}

export async function prepareDesktopSource<T extends { id?: string; }>(source: T, options: CaptureOptions) {
    if (!isElectronSourceId(source?.id)) return source;

    try {
        const engine = MediaEngineStore.getMediaEngine() as unknown as WebRTCEngine;
        return { ...source, id: await capture(engine, source.id, options) };
    } catch (err) {
        reportCaptureError(err);
        return source;
    }
}

async function recapture(engine: WebRTCEngine, source: GoLiveSource, context: string, options: CapturedInput) {
    if (capturing.has(options.sourceId)) return;

    capturing.add(options.sourceId);
    try {
        const inputId = await capture(engine, options.sourceId, options);
        engine.setGoLiveSource({ ...source, desktopDescription: { ...source.desktopDescription, id: inputId } }, context);
    } catch (err) {
        reportCaptureError(err);
    } finally {
        capturing.delete(options.sourceId);
    }
}

export function captureDesktopSource(engine: WebRTCEngine, source: GoLiveSource, context: string) {
    const { id, soundshareId, useLoopback } = source.desktopDescription;
    const { resolution, frameRate } = source.quality ?? {};

    if (isElectronSourceId(id)) {
        void recapture(engine, source, context, { sourceId: id, resolution, frameRate, audio: soundshareId != null || !!useLoopback });
        return;
    }

    const previous = capturedInputs.get(id);
    if (!previous || (resolution === previous.resolution && frameRate === previous.frameRate)) return;

    clearTimeout(qualityChangeTimer);
    qualityChangeTimer = setTimeout(() => void recapture(engine, source, context, { ...previous, resolution, frameRate }), 1500);
}

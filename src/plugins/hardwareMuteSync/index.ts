/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { MediaEngineStore, showToast } from "@webpack/common";

const AudioActions = findByPropsLazy("toggleSelfMute", "toggleSelfDeaf");
const logger = new Logger("HardwareMuteSync");

// A hardware-muted mic still outputs a tiny resampling residue (~1e-9), never exact zeros,
// while a live mic's noise floor stays well above this level
const MUTE_THRESHOLD = 1e-5;

const settings = definePluginSettings({
    deviceName: {
        type: OptionType.STRING,
        description: "Part of the name of the microphone to watch (e.g. DuoCast, QuadCast). Leave empty to use the Windows default microphone",
        default: "",
        onChange: () => restart()
    },
    delayMs: {
        type: OptionType.SLIDER,
        description: "Milliseconds of silence before the microphone is considered muted",
        markers: [200, 300, 400, 600, 800, 1000],
        default: 400,
        stickToMarkers: true
    },
    unmuteDiscord: {
        type: OptionType.BOOLEAN,
        description: "Unmute Discord when the microphone is unmuted (only if the plugin muted it)",
        default: true
    },
    notifications: {
        type: OptionType.BOOLEAN,
        description: "Show a toast when the plugin mutes or unmutes Discord",
        default: false
    }
});

let stream: MediaStream | null = null;
let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let buffer: Float32Array<ArrayBuffer> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let silentSince = 0;
let hardwareMuted = false;
let mutedByUs = false;
let running = false;

function notify(text: string) {
    logger.info(text);
    if (settings.store.notifications) showToast({ text });
}

function isSilent(): boolean {
    analyser!.getFloatTimeDomainData(buffer!);
    for (let i = 0; i < buffer!.length; i++) if (Math.abs(buffer![i]) > MUTE_THRESHOLD) return false;
    return true;
}

function check() {
    if (!analyser || !ctx) return;
    if (ctx.state !== "running") {
        ctx.resume().catch(() => { });
        silentSince = 0;
        return;
    }
    const track = stream?.getAudioTracks()[0];
    if (!track || track.readyState !== "live" || track.muted) {
        silentSince = 0;
        return;
    }

    const now = performance.now();
    if (isSilent()) {
        if (!silentSince) silentSince = now;
        if (!hardwareMuted && now - silentSince >= settings.store.delayMs) {
            hardwareMuted = true;
            if (!MediaEngineStore.isSelfMute()) {
                AudioActions.toggleSelfMute();
                mutedByUs = true;
                notify("Microphone muted: Discord muted");
            }
        }
        return;
    }

    silentSince = 0;
    if (!hardwareMuted) return;
    hardwareMuted = false;
    if (mutedByUs && settings.store.unmuteDiscord && MediaEngineStore.isSelfMute() && !MediaEngineStore.isSelfDeaf()) {
        AudioActions.toggleSelfMute();
        notify("Microphone unmuted: Discord unmuted");
    }
    mutedByUs = false;
}

function close() {
    if (timer) clearInterval(timer);
    timer = null;
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    ctx?.close().catch(() => { });
    ctx = null;
    analyser = null;
    buffer = null;
    silentSince = 0;
}

async function open() {
    close();
    if (!running) return;

    const filter = settings.store.deviceName.trim().toLowerCase();
    let deviceId = "default";
    let label = "default microphone";
    if (filter) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mic = devices.find(d => d.kind === "audioinput" && d.deviceId !== "default" && d.deviceId !== "communications" && d.label.toLowerCase().includes(filter));
        if (!mic) {
            logger.warn(`No microphone matching "${filter}"`);
            return;
        }
        deviceId = mic.deviceId;
        label = mic.label;
    }

    const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            deviceId: { exact: deviceId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        }
    });
    if (!running) {
        newStream.getTracks().forEach(t => t.stop());
        return;
    }

    stream = newStream;
    ctx = new AudioContext();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    buffer = new Float32Array(analyser.fftSize);
    ctx.createMediaStreamSource(stream).connect(analyser);
    stream.getAudioTracks()[0].addEventListener("ended", () => restart());
    timer = setInterval(check, 50);
    logger.info(`Watching ${label}`);
}

function restart() {
    if (!running) return;
    open().catch(e => logger.error("Failed to open the microphone", e));
}

export default definePlugin({
    name: "HardwareMuteSync",
    description: "Mutes Discord when you mute your microphone with its hardware button (e.g. HyperX DuoCast tap-to-mute) and unmutes it when you unmute",
    authors: [Devs.MaNu],
    settings,

    start() {
        running = true;
        hardwareMuted = false;
        mutedByUs = false;
        navigator.mediaDevices.addEventListener("devicechange", restart);
        restart();
    },

    stop() {
        running = false;
        navigator.mediaDevices.removeEventListener("devicechange", restart);
        close();
    }
});

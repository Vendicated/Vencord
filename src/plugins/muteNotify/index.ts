/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { SelectedChannelStore, UserStore, VoiceStateStore } from "@webpack/common";

const MediaEngineStore = findStoreLazy("MediaEngineStore");

const settings = definePluginSettings({
    threshold: {
        type: OptionType.SLIDER,
        description: "Microphone input threshold to trigger the notification (lower = more sensitive)",
        default: 0.1,
        markers: [0.01, 0.05, 0.1, 0.2, 0.3],
        stickToMarkers: false
    },
    volume: {
        type: OptionType.SLIDER,
        description: "Notification sound volume",
        default: 0.5,
        markers: [0, 0.25, 0.5, 0.75, 1],
        stickToMarkers: false
    },
    frequency: {
        type: OptionType.SLIDER,
        description: "Notification sound frequency",
        default: 1920, // B6 note
        min: 200,
        max: 2000,
        step: 10,
        markers: [700, 1920, 2000],
        stickToMarkers: false
    }
});

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let microphone: MediaStreamAudioSourceNode | null = null;
let mediaStream: MediaStream | null = null;
let checkInterval: number | null = null;
let isBeeping = false;
let lastBeepTime = 0;
const BEEP_DURATION = 200; // ms
const BEEP_INTERVAL = 3000; // ms
const logger = new Logger("MuteNotify");

function isMuted(): boolean {
    const chanId = SelectedChannelStore.getVoiceChannelId();
    if (!chanId) return false;

    const myId = UserStore.getCurrentUser()?.id;
    if (!myId) return false;

    const voiceState = VoiceStateStore.getVoiceStateForChannel(chanId, myId);
    return voiceState?.mute || voiceState?.selfMute || false;
}

function playBeep() {
    if (!audioContext || isBeeping) return;

    const now = Date.now();
    if (now - lastBeepTime < BEEP_INTERVAL) return;

    isBeeping = true;
    lastBeepTime = now;

    try {
        const toneFrequency = settings.store.frequency;
        const toneDuration = 200; // ms for each tone
        const toneGap = 40; // ms between tones

        // First tone
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();

        osc1.connect(gain1);
        gain1.connect(audioContext.destination);

        osc1.frequency.value = toneFrequency;
        osc1.type = "sine";
        gain1.gain.value = settings.store.volume;

        const startTime = audioContext.currentTime;
        osc1.start(startTime);
        osc1.stop(startTime + toneDuration / 1000);

        // Second tone (starts after first tone + gap)
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();

        osc2.connect(gain2);
        gain2.connect(audioContext.destination);

        osc2.frequency.value = toneFrequency;
        osc2.type = "sine";
        gain2.gain.value = settings.store.volume;

        const secondToneStart = startTime + (toneDuration + toneGap) / 1000;
        osc2.start(secondToneStart);
        osc2.stop(secondToneStart + toneDuration / 1000);

        // Reset isBeeping after both tones complete
        setTimeout(() => {
            isBeeping = false;
        }, BEEP_DURATION);
    } catch (err) {
        logger.error("Failed to play beep:", err);
        isBeeping = false;
    }
}

function checkAudioLevel() {
    if (!analyser) {
        return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = average / 255;

    // If speaking while muted, play the beep
    if (normalizedLevel > settings.store.threshold) {
        playBeep();
    }
}

async function startMonitoring() {
    try {
        // Create audio context
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        // Get microphone stream
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: MediaEngineStore.getInputDeviceId()
            }
        });

        microphone = audioContext.createMediaStreamSource(mediaStream);
        microphone.connect(analyser);

        // Start checking audio levels
        checkInterval = window.setInterval(checkAudioLevel, 100);

        logger.info("Started monitoring microphone input");
    } catch (err) {
        logger.error("Failed to start monitoring:", err);
    }
}

function stopMonitoring() {
    if (checkInterval !== null) {
        clearInterval(checkInterval);
        checkInterval = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    if (microphone) {
        microphone.disconnect();
        microphone = null;
    }

    if (analyser) {
        analyser = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    isBeeping = false;
    logger.info("Stopped monitoring microphone input");
}

function handleVoiceChannelChange() {
    const chanId = SelectedChannelStore.getVoiceChannelId();
    const muted = isMuted();

    if (chanId && muted) {
        // In a voice channel and muted, start monitoring
        if (!audioContext) {
            startMonitoring();
        }
    } else {
        // Not in voice channel or not muted, stop monitoring
        if (audioContext) {
            stopMonitoring();
        }
    }
}

export default definePlugin({
    name: "MuteNotify",
    description: "Forget you muted? Get a reminding sound when speaking while muted.",
    authors: [Devs.BothimTV],
    settings,

    flux: {
        VOICE_STATE_UPDATES() {
            handleVoiceChannelChange();
        },
        AUDIO_TOGGLE_SELF_MUTE() {
            handleVoiceChannelChange();
        },
        AUDIO_TOGGLE_SELF_DEAF() {
            handleVoiceChannelChange();
        }
    },

    start() {
        // Only start monitoring if already in a voice channel
        handleVoiceChannelChange();
    },

    stop() {
        stopMonitoring();
    }
});

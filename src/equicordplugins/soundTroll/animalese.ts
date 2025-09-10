/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "./settings";

export let audioContext: AudioContext | null = null;

export async function init() {
    if (!audioContext) {
        audioContext = new AudioContext();
        await initSoundBuffers();
    }
    init();
}

export async function kill() {
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}

// better than my old hardcoded garbage
export const highSounds = Array.from(
    { length: 30 },
    (_, i) => `sound${String(i + 1).padStart(2, "0")}.wav`
);
export const soundBuffers: Record<string, AudioBuffer> = {};

export const BASE_URL_HIGH = "https://raw.githubusercontent.com/Equicord/Equibored/main/sounds/animalese";

export async function initSoundBuffers() {
    if (!audioContext) audioContext = new AudioContext();
    const quality = settings.store.soundQuality;
    for (const file of highSounds) {
        const nameWithoutExt = file.replace(".wav", "");
        soundBuffers[nameWithoutExt] = await loadSound(
            `${BASE_URL_HIGH}/${quality}/${file}`
        );
    }
}

export async function loadSound(url: string): Promise<AudioBuffer> {
    if (!audioContext) audioContext = new AudioContext();
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not OK");
    const arrayBuffer = await response.arrayBuffer();
    return audioContext.decodeAudioData(arrayBuffer);
}

export async function generateAnimalese(text: string): Promise<AudioBuffer | null> {
    if (!audioContext) audioContext = new AudioContext();

    const soundIndices: string[] = [];
    const text_lower = text.toLowerCase();

    for (let i = 0; i < text_lower.length; i++) {
        const char = text_lower[i];
        if (char === "s" && text_lower[i + 1] === "h") {
            soundIndices.push("sound27");
            i++;
        } else if (char === "t" && text_lower[i + 1] === "h") {
            soundIndices.push("sound28");
            i++;
        } else if (
            char === "h" &&
            (text_lower[i - 1] === "s" || text_lower[i - 1] === "t")
        ) {
            continue;
        } else if (char === "," || char === "?") {
            soundIndices.push("sound30");
        } else if (char === text_lower[i - 1]) {
            continue;
        } else if (char.match(/[a-z]/)) {
            const index = char.charCodeAt(0) - 96;
            soundIndices.push(`sound${String(index).padStart(2, "0")}`);
        }
    }

    // No valid characters? Just return null
    if (soundIndices.length === 0) {
        return null;
    }

    const totalDuration = soundIndices.length * 0.1;
    const frameCount = Math.max(1, Math.floor(audioContext.sampleRate * totalDuration));

    const outputBuffer = audioContext.createBuffer(
        1,
        frameCount,
        audioContext.sampleRate
    );
    const outputData = outputBuffer.getChannelData(0);

    let offset = 0;
    const baseLetterDuration = audioContext.sampleRate * (0.09 / settings.store.speed);
    // ~90ms per letter at 1x speed (tweakable!)

    for (let i = 0; i < soundIndices.length; i++) {
        const buffer = soundBuffers[soundIndices[i]];
        if (!buffer) continue;

        const variation = 0.15;
        let pitchShift = (2.8 * settings.store.pitch) + (Math.random() * variation);

        const isQuestion = text_lower.endsWith("?");
        if (isQuestion && i >= soundIndices.length * 0.8) {
            const progress =
                (i - soundIndices.length * 0.8) / (soundIndices.length * 0.2);
            pitchShift += progress * 0.1 + 0.1;
        }

        const inputData = buffer.getChannelData(0);
        const inputLength = inputData.length;
        const outputLength = Math.floor(inputLength / pitchShift);

        // copy sound into the slot
        for (let j = 0; j < outputLength; j++) {
            const inputIndex = Math.floor(j * pitchShift);
            const targetIndex = offset + j;
            if (inputIndex < inputLength && targetIndex < outputData.length) {
                outputData[targetIndex] = inputData[inputIndex];
            }
        }

        // instead of stacking lengths, jump forward a *fixed slot* per character
        offset += Math.floor(baseLetterDuration);
    }

    return outputBuffer;
}

export async function playSound(buffer: AudioBuffer, volume: number) {
    if (!audioContext) audioContext = new AudioContext();
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.buffer = buffer;
    source.playbackRate.value = settings.store.pitch;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    source.start();
}

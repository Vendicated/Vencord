/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { SelectedChannelStore, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    volume: {
        type: OptionType.SLIDER,
        description: "Volume of the animalese sound",
        default: 0.5,
        markers: [0, 0.1, 0.25, 0.5, 0.6, 0.75, 1],
    },
    speed: {
        type: OptionType.SLIDER,
        description: "Speed of the animalese sound",
        default: 1,
        markers: [0.5, 0.75, 1, 1.25, 1.5],
    },
    pitch: {
        type: OptionType.SLIDER,
        description: "Pitch multiplier",
        default: 1,
        markers: [0.75, 0.8, 0.85, 1, 1.15, 1.25, 1.35, 1.5],
    },
    messageLengthLimit: {
        type: OptionType.NUMBER,
        description: "Maximum length of message to process",
        default: 50,
    },
    processOwnMessages: {
        type: OptionType.BOOLEAN,
        description: "Enable to yap your own messages too",
        default: true,
    },
    soundQuality: {
        type: OptionType.SELECT,
        description: "Quality of sound to use",
        options: [
            {
                label: "High",
                value: "high",
                default: true
            },
            {
                label: "Medium",
                value: "med"
            },
            {
                label: "Low",
                value: "low"
            },
            {
                label: "Lowest",
                value: "low"
            }
        ]
    }
});

let audioContext: AudioContext | null = null;

// better than my old hardcoded garbage
const highSounds = Array.from(
    { length: 30 },
    (_, i) => `sound${String(i + 1).padStart(2, "0")}.wav`
);
const soundBuffers: Record<string, AudioBuffer> = {};

const BASE_URL_HIGH = "https://raw.githubusercontent.com/Equicord/Equibored/main/sounds/animalese";

async function initSoundBuffers() {
    if (!audioContext) audioContext = new AudioContext();
    const quality = settings.store.soundQuality;
    for (const file of highSounds) {
        const nameWithoutExt = file.replace(".wav", "");
        soundBuffers[nameWithoutExt] = await loadSound(
            `${BASE_URL_HIGH}/${quality}/${file}`
        );
    }
}

async function loadSound(url: string): Promise<AudioBuffer> {
    if (!audioContext) audioContext = new AudioContext();
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not OK");
    const arrayBuffer = await response.arrayBuffer();
    return audioContext.decodeAudioData(arrayBuffer);
}

async function generateAnimalese(text: string): Promise<AudioBuffer | null> {
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

async function playSound(buffer: AudioBuffer, volume: number) {
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

export default definePlugin({
    name: "Animalese",
    description: "Plays animal crossing animalese for every message sent (they yap a lot)",
    authors: [EquicordDevs.ryanamay, EquicordDevs.Mocha],
    settings,

    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (!message.content || message.author?.bot || channelId !== SelectedChannelStore.getChannelId()) return;

            const urlPattern = /https?:\/\/[^\s]+/;
            const maxLength = settings.store.messageLengthLimit || 100;
            const processOwnMessages = settings.store.processOwnMessages ?? true;

            if (
                urlPattern.test(message.content)
                || message.content.length > maxLength
                || !processOwnMessages
                && String(message.author.id) === String(UserStore.getCurrentUser().id)
            ) return;

            try {
                const buffer = await generateAnimalese(message.content);
                if (buffer) await playSound(buffer, settings.store.volume);
            } catch (err) {
                console.error("[Animalese]", err);
            }
        }
    },

    start() {
        // Only subscribe once!
        const init = async () => {
            if (!audioContext) {
                audioContext = new AudioContext();
                await initSoundBuffers();
            }
            init();
        };
        init();
    },

    stop() {
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
    },
});

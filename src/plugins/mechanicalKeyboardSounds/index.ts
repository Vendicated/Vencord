/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

type KeySoundKind = "regular" | "accent";

const settings = definePluginSettings({
    volume: {
        type: OptionType.SLIDER,
        description: "Mechanical key sound volume",
        markers: [0, 10, 20, 30, 40, 50, 75, 100],
        default: 30,
        stickToMarkers: false
    },
    playSpecialKeys: {
        type: OptionType.BOOLEAN,
        description: "Play a deeper sound for Enter, Backspace and Space",
        default: true
    },
    playOnKeyRepeat: {
        type: OptionType.BOOLEAN,
        description: "Keep playing sounds while a key is held down",
        default: false
    }
});

const modifierKeys = new Set([
    "Alt",
    "AltGraph",
    "CapsLock",
    "Control",
    "Fn",
    "Meta",
    "NumLock",
    "ScrollLock",
    "Shift",
]);

let audioContext: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function randomBetween(min: number, max: number) {
    return min + Math.random() * (max - min);
}

function getElement(target: EventTarget | null) {
    if (target instanceof HTMLElement) return target;
    if (target instanceof Node) return target.parentElement;
    if (document.activeElement instanceof HTMLElement) return document.activeElement;
    return null;
}

function isMessageComposer(target: EventTarget | null) {
    const element = getElement(target);
    if (!element) return false;

    const editable = element.closest<HTMLElement>("textarea, [contenteditable='true'], [role='textbox']");
    if (!editable) return false;

    if (editable.closest("[class*='channelTextArea'], [class*='slateTextArea'], [class*='textArea']"))
        return true;

    const ariaLabel = [
        editable.getAttribute("aria-label"),
        editable.closest<HTMLElement>("[aria-label]")?.getAttribute("aria-label")
    ].find(Boolean)?.toLowerCase();

    if (ariaLabel?.includes("message") || ariaLabel?.includes("send"))
        return true;

    return editable.closest("form") != null;
}

function classifyKey(event: KeyboardEvent): KeySoundKind | null {
    if (event.isComposing) return null;
    if (event.ctrlKey || event.metaKey || event.altKey) return null;
    if (modifierKeys.has(event.key) || event.key === "Dead" || event.key === "Process") return null;
    if (event.repeat && !settings.store.playOnKeyRepeat) return null;

    if (event.key.length === 1)
        return event.key === " " && settings.store.playSpecialKeys ? "accent" : "regular";

    if (settings.store.playSpecialKeys && (event.key === "Enter" || event.key === "Backspace"))
        return "accent";

    return null;
}

function getAudioContext() {
    if (audioContext && audioContext.state !== "closed") return audioContext;

    const AudioContextCtor = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext; }).webkitAudioContext;

    if (!AudioContextCtor) return null;

    audioContext = new AudioContextCtor();
    noiseBuffer = null;
    return audioContext;
}

function getNoiseBuffer(context: AudioContext) {
    if (noiseBuffer) return noiseBuffer;

    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.08), context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < channel.length; i++) {
        channel[i] = Math.random() * 2 - 1;
    }

    noiseBuffer = buffer;
    return buffer;
}

function playMechanicalSound(kind: KeySoundKind) {
    const context = getAudioContext();
    if (!context || settings.store.volume <= 0) return;

    if (context.state === "suspended") {
        void context.resume().then(() => {
            if (context.state !== "closed")
                synthesizeKeySound(context, kind);
        }).catch(() => {});
        return;
    }

    synthesizeKeySound(context, kind);
}

function synthesizeKeySound(context: AudioContext, kind: KeySoundKind) {
    const accent = kind === "accent";
    const now = context.currentTime;
    const output = context.createGain();

    output.gain.setValueAtTime(settings.store.volume / 100, now);
    output.connect(context.destination);

    const noise = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noisePeak = context.createBiquadFilter();
    const noiseGain = context.createGain();

    noise.buffer = getNoiseBuffer(context);
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = accent ? randomBetween(1200, 1800) : randomBetween(1800, 2600);
    noisePeak.type = "bandpass";
    noisePeak.frequency.value = accent ? randomBetween(1700, 2500) : randomBetween(2600, 4200);
    noisePeak.Q.value = accent ? 0.7 : 1.1;

    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(accent ? 0.2 : 0.12, now + 0.0015);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + (accent ? 0.03 : 0.02));

    noise.connect(noiseFilter);
    noiseFilter.connect(noisePeak);
    noisePeak.connect(noiseGain);
    noiseGain.connect(output);

    const bodyOsc = context.createOscillator();
    const bodyFilter = context.createBiquadFilter();
    const bodyGain = context.createGain();

    bodyOsc.type = accent ? "square" : "triangle";
    bodyOsc.frequency.setValueAtTime(accent ? randomBetween(700, 850) : randomBetween(1100, 1400), now);
    bodyOsc.frequency.exponentialRampToValueAtTime(accent ? randomBetween(240, 320) : randomBetween(350, 460), now + (accent ? 0.05 : 0.04));

    bodyFilter.type = "lowpass";
    bodyFilter.frequency.value = accent ? 1500 : 2400;
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.exponentialRampToValueAtTime(accent ? 0.11 : 0.065, now + 0.0015);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + (accent ? 0.06 : 0.045));

    bodyOsc.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(output);

    let thockOsc: OscillatorNode | null = null;
    let thockGain: GainNode | null = null;

    if (accent) {
        thockOsc = context.createOscillator();
        thockGain = context.createGain();

        thockOsc.type = "sine";
        thockOsc.frequency.setValueAtTime(randomBetween(140, 180), now);
        thockOsc.frequency.exponentialRampToValueAtTime(randomBetween(70, 90), now + 0.07);
        thockGain.gain.setValueAtTime(0.0001, now);
        thockGain.gain.exponentialRampToValueAtTime(0.07, now + 0.004);
        thockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

        thockOsc.connect(thockGain);
        thockGain.connect(output);
    }

    noise.start(now);
    noise.stop(now + (accent ? 0.03 : 0.02));
    bodyOsc.start(now);
    bodyOsc.stop(now + (accent ? 0.06 : 0.045));
    thockOsc?.start(now);
    thockOsc?.stop(now + 0.08);

    window.setTimeout(() => {
        noise.disconnect();
        noiseFilter.disconnect();
        noisePeak.disconnect();
        noiseGain.disconnect();
        bodyOsc.disconnect();
        bodyFilter.disconnect();
        bodyGain.disconnect();
        thockOsc?.disconnect();
        thockGain?.disconnect();
        output.disconnect();
    }, 150);
}

function onKeyDown(event: KeyboardEvent) {
    if (!isMessageComposer(event.target)) return;

    const kind = classifyKey(event);
    if (!kind) return;

    playMechanicalSound(kind);
}

function closeAudioContext() {
    const context = audioContext;
    audioContext = null;
    noiseBuffer = null;

    if (!context || context.state === "closed") return;
    void context.close().catch(() => {});
}

export default definePlugin({
    name: "MechanicalKeyboardSounds",
    description: "Adds a synthetic mechanical keyboard click while you type in Discord's message box",
    authors: [Devs.DG],
    settings,
    requiresRestart: false,

    start() {
        document.addEventListener("keydown", onKeyDown, true);
    },

    stop() {
        document.removeEventListener("keydown", onKeyDown, true);
        closeAudioContext();
    }
});

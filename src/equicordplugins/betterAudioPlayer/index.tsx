/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

const fileSizeLimit = 12e6;

function parseFileSize(size: string) {
    const [value, unit] = size.split(" ");
    const multiplier = {
        B: 1,
        KB: 1024,
        MB: 1024 ** 2,
        GB: 1024 ** 3,
        TB: 1024 ** 4,
    }[unit];
    if (!multiplier) return;
    return parseFloat(value) * multiplier;
}

function getMetadata(audioElement: HTMLElement) {
    const metadataElement = audioElement.querySelector("[class^='metadataContent_']");
    const nameElement = metadataElement?.querySelector("a");
    const sizeElement = audioElement.querySelector("[class^='metadataContent_'] [class^='metadataSize_']");
    const url = nameElement?.getAttribute("href");
    const audioElementLink = audioElement.querySelector("audio");

    if (!sizeElement?.textContent || !nameElement?.textContent || !url || !audioElementLink) return false;

    const name = nameElement.textContent;
    const size = parseFileSize(sizeElement.textContent);

    if (size && size > fileSizeLimit) {
        return false;
    }

    const elements = [metadataElement?.parentElement, audioElement.querySelector("[class^='audioControls_']")];

    const computedStyle = getComputedStyle(audioElement);
    const parentBorderRadius = computedStyle.borderRadius;

    if (settings.store.forceMoveBelow) {
        elements.forEach(element => {
            if (element) (element as HTMLElement).style.zIndex = "2";
        });
    }

    return {
        name,
        size,
        url,
        audio: audioElementLink,
        parentBorderRadius: parentBorderRadius,
    };
}

async function addListeners(audioElement: HTMLAudioElement, url: string, parentBorderRadius: string) {
    const madeURL = new URL(url);
    madeURL.searchParams.set("t", Date.now().toString());

    // thanks thororen :p
    const corsProxyUrl = "https://cors.thororen.com/?url=" + encodeURIComponent(madeURL.href);
    const response = await fetch(corsProxyUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);

    const source = audioContext.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const canvas = document.createElement("canvas");
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) return;

    canvas.classList.add("better-audio-visualizer");
    audioElement.parentElement?.appendChild(canvas);

    console.log(parentBorderRadius);
    if (parentBorderRadius) canvas.style.borderRadius = parentBorderRadius;

    function drawVisualizer() {
        if (!audioElement.paused) {
            requestAnimationFrame(drawVisualizer);
        }

        analyser.getByteTimeDomainData(dataArray);
        analyser.getByteFrequencyData(frequencyData);

        if (!canvasContext) return;
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);

        if (settings.store.oscilloscope) drawOscilloscope(canvasContext, canvas, dataArray, bufferLength);
        if (settings.store.spectrograph) drawSpectrograph(canvasContext, canvas, frequencyData, bufferLength);
    }

    audioElement.src = blobUrl;
    audioElement.addEventListener("play", () => {
        if (audioContext.state === "suspended") {
            audioContext.resume();
        }
        drawVisualizer();
    });

    audioElement.addEventListener("pause", () => {
        audioContext.suspend();
    });
}

function drawOscilloscope(canvasContext, canvas, dataArray, bufferLength) {
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    const { oscilloscopeSolidColor, oscilloscopeColor } = settings.store;

    const [r, g, b] = oscilloscopeColor.split(",").map(Number);

    canvasContext.lineWidth = 2;
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    canvasContext.beginPath();

    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (oscilloscopeSolidColor) {
            canvasContext.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        } else {
            const red = Math.min(r + (v * 100) + (i / bufferLength) * 155, 255);
            const green = Math.min(g + (v * 50) + (i / bufferLength) * 155, 255);
            const blue = Math.min(b + (v * 150) + (i / bufferLength) * 155, 255);

            canvasContext.strokeStyle = `rgb(${red}, ${green}, ${blue})`;
        }

        if (i === 0) {
            canvasContext.moveTo(x, y);
        } else {
            canvasContext.lineTo(x, y);
        }

        x += sliceWidth;
    }

    canvasContext.stroke();
}

function drawSpectrograph(canvasContext, canvas, frequencyData, bufferLength) {
    const { spectrographSolidColor, spectrographColor } = settings.store;
    const maxHeight = canvas.height;
    const barWidth = canvas.width / bufferLength;
    let x = 0;

    const maxFrequencyValue = Math.max(...frequencyData);

    if (maxFrequencyValue === 0 || !isFinite(maxFrequencyValue)) {
        return;
    }

    for (let i = 0; i < bufferLength; i++) {
        const normalizedHeight = (frequencyData[i] / maxFrequencyValue) * maxHeight;

        if (spectrographSolidColor) {
            canvasContext.fillStyle = `rgb(${spectrographColor})`;
        } else {
            const [r, g, b] = spectrographColor.split(",").map(Number);

            const red = Math.min(r + (i / bufferLength) * 155, 255);
            const green = Math.min(g + (i / bufferLength) * 155, 255);
            const blue = Math.min(b + (i / bufferLength) * 155, 255);

            const gradient = canvasContext.createLinearGradient(x, canvas.height - normalizedHeight, x, canvas.height);
            gradient.addColorStop(0, `rgb(${red}, ${green}, ${blue})`);

            const darkerColor = `rgb(${Math.max(red - 50, 0)},${Math.max(green - 50, 0)},${Math.max(blue - 50, 0)})`;

            gradient.addColorStop(1, darkerColor);
            canvasContext.fillStyle = gradient;
        }

        canvasContext.fillRect(x, canvas.height - normalizedHeight, barWidth, normalizedHeight);
        x += barWidth + 0.5;
    }
}

function scanForAudioElements(element: HTMLElement) {
    element.querySelectorAll("[class^='wrapperAudio_']:not([data-better-audio-processed])").forEach(audioElement => {
        (audioElement as HTMLElement).dataset.betterAudioProcessed = "true";
        const metadata = getMetadata(audioElement as HTMLElement);

        if (!metadata) return;

        console.log(audioElement);
        console.log(metadata);

        addListeners(metadata.audio, metadata.url, metadata.parentBorderRadius);
    });
}

function createObserver(targetNode: HTMLElement) {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach(addedNode => {
                    if (addedNode instanceof HTMLElement) {
                        scanForAudioElements(addedNode);
                    }
                });
            }
        });
    });
    observer.observe(targetNode, {
        childList: true,
        subtree: true,
    });
}

function tryHexToRgb(hex) {
    if (hex.startsWith("#")) {
        const hexMatch = hex.match(/\w\w/g);
        if (hexMatch) {
            const [r, g, b] = hexMatch.map(x => parseInt(x, 16));
            return `${r}, ${g}, ${b}`;
        }
    }
    return hex;
}

function handleColorChange(value, settingKey, defaultValue) {
    const rgbPattern = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/;

    if (!value.match(rgbPattern)) {
        const rgb = tryHexToRgb(value);

        if (rgb.match(rgbPattern)) {
            settings.store[settingKey] = rgb;
        } else {
            showToast(`Invalid color format for ${settingKey}, make sure it's in the format 'R, G, B' or '#RRGGBB'`, Toasts.Type.FAILURE);
            settings.store[settingKey] = defaultValue;
        }
    } else {
        settings.store[settingKey] = value;
    }
}

const settings = definePluginSettings({
    oscilloscope: {
        type: OptionType.BOOLEAN,
        description: "Enable oscilloscope visualizer",
        default: true,
    },
    spectrograph: {
        type: OptionType.BOOLEAN,
        description: "Enable spectrograph visualizer",
        default: true,
    },
    oscilloscopeSolidColor: {
        type: OptionType.BOOLEAN,
        description: "Use solid color for oscilloscope",
        default: false,
    },
    oscilloscopeColor: {
        type: OptionType.STRING,
        description: "Color for oscilloscope",
        default: "255, 255, 255",
        onChange: value => handleColorChange(value, "oscilloscopeColor", "255, 255, 255"),
    },
    spectrographSolidColor: {
        type: OptionType.BOOLEAN,
        description: "Use solid color for spectrograph",
        default: false,
    },
    spectrographColor: {
        type: OptionType.STRING,
        description: "Color for spectrograph",
        default: "33, 150, 243",
        onChange: value => handleColorChange(value, "spectrographColor", "33, 150, 243"),
    },
    forceMoveBelow: {
        type: OptionType.BOOLEAN,
        description: "Force the visualizer below the audio player",
        default: true,
    },
});

export default definePlugin({
    name: "BetterAudioPlayer",
    description: "Adds a spectrograph and oscilloscope visualizer to audio attachment players",
    authors: [EquicordDevs.creations],
    settings,
    start() {
        const waitForContent = () => {
            const targetNode = document.querySelector("[class^='content_']");
            if (targetNode) {
                scanForAudioElements(targetNode as HTMLElement);
                createObserver(targetNode as HTMLElement);
            } else {
                requestAnimationFrame(waitForContent);
            }
        };
        waitForContent();
    },
});

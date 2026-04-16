/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { ColorUtils, React, showToast, Toasts } from "@webpack/common";

const cl = classNameFactory("vc-better-audio-player-");
const CORS_PROXY = "https://cors.keiran0.workers.dev?url=";
const MAX_FILE_SIZE = 12e6;

interface PlayerInstance {
    mediaRef: React.RefObject<HTMLAudioElement>;
    props: { src: string; type: string; };
}

function validateColor(value: string, key: string, fallback: string) {
    if (/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(value)) return;

    try {
        const rgb = ColorUtils.hexToRgb(value.replace("#", ""));
        if (rgb) {
            settings.store[key] = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
            return;
        }
    } catch { /* invalid hex */ }

    showToast(`Invalid color format for ${key}, use "R, G, B" or "#RRGGBB"`, Toasts.Type.FAILURE);
    settings.store[key] = fallback;
}

function maxTypedArray(arr: Uint8Array<ArrayBufferLike>): number {
    let max = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] > max) max = arr[i];
    }
    return max;
}

function drawOscilloscope(ctx: CanvasRenderingContext2D, w: number, h: number, dataArray: Uint8Array<ArrayBufferLike>, bufferLength: number) {
    const sliceWidth = w / bufferLength;
    const [r, g, b] = settings.store.oscilloscopeColor.split(",").map(Number);
    const amp = 3;
    let x = 0;

    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        const y = (h / 2) - (v * amp * h / 2);

        if (settings.store.oscilloscopeSolidColor) {
            ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        } else {
            const absV = Math.abs(v);
            ctx.strokeStyle = `rgb(${Math.min(r + absV * 100 + (i / bufferLength) * 155, 255)}, ${Math.min(g + absV * 50 + (i / bufferLength) * 155, 255)}, ${Math.min(b + absV * 150 + (i / bufferLength) * 155, 255)})`;
        }

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
    }
    ctx.stroke();
}

function drawSpectrograph(ctx: CanvasRenderingContext2D, w: number, h: number, frequencyData: Uint8Array<ArrayBufferLike>, bufferLength: number) {
    const barWidth = w / bufferLength;
    const maxVal = maxTypedArray(frequencyData);
    if (maxVal === 0) return;

    const [r, g, b] = settings.store.spectrographColor.split(",").map(Number);
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barH = (frequencyData[i] / maxVal) * h;

        if (settings.store.spectrographSolidColor) {
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        } else {
            const red = Math.min(r + (i / bufferLength) * 155, 255);
            const green = Math.min(g + (i / bufferLength) * 155, 255);
            const blue = Math.min(b + (i / bufferLength) * 155, 255);
            const gradient = ctx.createLinearGradient(x, h - barH, x, h);
            gradient.addColorStop(0, `rgb(${red}, ${green}, ${blue})`);
            gradient.addColorStop(1, `rgb(${Math.max(red - 50, 0)}, ${Math.max(green - 50, 0)}, ${Math.max(blue - 50, 0)})`);
            ctx.fillStyle = gradient;
        }

        ctx.fillRect(x, h - barH, barWidth, barH);
        x += barWidth + 0.5;
    }
}

async function fetchAudioBlob(src: string): Promise<string | null> {
    const url = new URL(src);
    url.searchParams.set("t", Date.now().toString());

    const response = await fetch(CORS_PROXY + encodeURIComponent(url.href));
    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_FILE_SIZE) return null;

    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

function Visualizer({ playerRef, src }: { playerRef: React.RefObject<HTMLAudioElement>; src: string; }) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const audioCtxRef = React.useRef<AudioContext | null>(null);
    const analyserRef = React.useRef<AnalyserNode | null>(null);
    const animFrameRef = React.useRef(0);
    const setupDoneRef = React.useRef(false);
    const blobUrlRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        const audio = playerRef.current;
        const canvas = canvasRef.current;
        if (!audio || !canvas) return () => { };

        let cancelled = false;

        const init = async () => {
            const blobUrl = await fetchAudioBlob(src).catch(() => null);
            if (cancelled || !blobUrl) return;

            blobUrlRef.current = blobUrl;

            const wasPlaying = !audio.paused;
            const { currentTime } = audio;
            audio.src = blobUrl;
            audio.currentTime = currentTime;

            const audioCtx = new AudioContext();
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            const source = audioCtx.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            audioCtxRef.current = audioCtx;
            analyserRef.current = analyser;
            setupDoneRef.current = true;

            if (wasPlaying) {
                audio.play().catch(() => { });
            }
        };

        const canvasCtx = canvas.getContext("2d");
        let dataArray: Uint8Array<ArrayBuffer> | null = null;
        let frequencyData: Uint8Array<ArrayBuffer> | null = null;

        const draw = () => {
            const analyser = analyserRef.current;
            if (!canvasCtx || !analyser) return;

            if (!dataArray || !frequencyData) {
                const bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
                frequencyData = new Uint8Array(bufferLength);
            }

            if (!audio.paused) animFrameRef.current = requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);
            analyser.getByteFrequencyData(frequencyData);

            const { width, height } = canvas.getBoundingClientRect();
            canvasCtx.clearRect(0, 0, width, height);
            if (settings.store.oscilloscope) drawOscilloscope(canvasCtx, width, height, dataArray, dataArray.length);
            if (settings.store.spectrograph) drawSpectrograph(canvasCtx, width, height, frequencyData, frequencyData.length);
        };

        const onPlay = () => {
            if (!setupDoneRef.current) return;
            if (audioCtxRef.current?.state === "suspended") {
                audioCtxRef.current.resume();
            }
            draw();
        };

        const onPause = () => {
            audioCtxRef.current?.suspend();
            cancelAnimationFrame(animFrameRef.current);
        };

        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);
        init();

        return () => {
            cancelled = true;
            audio.removeEventListener("play", onPlay);
            audio.removeEventListener("pause", onPause);
            cancelAnimationFrame(animFrameRef.current);
            audioCtxRef.current?.close();
            audioCtxRef.current = null;
            analyserRef.current = null;
            setupDoneRef.current = false;
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            }
        };
    }, [playerRef]);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return () => { };

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            const ctx = canvas.getContext("2d");
            ctx?.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    return (
        <canvas
            className={cl("canvas")}
            ref={canvasRef}
        />
    );
}

const settings = definePluginSettings({
    oscilloscope: {
        type: OptionType.BOOLEAN,
        description: "Enable oscilloscope visualizer.",
        default: true,
    },
    spectrograph: {
        type: OptionType.BOOLEAN,
        description: "Enable spectrograph visualizer.",
        default: true,
    },
    oscilloscopeSolidColor: {
        type: OptionType.BOOLEAN,
        description: "Use a solid color for the oscilloscope.",
        default: false,
    },
    oscilloscopeColor: {
        type: OptionType.STRING,
        description: "Color for the oscilloscope (R, G, B or #hex).",
        default: "255, 255, 255",
        onChange: value => validateColor(value, "oscilloscopeColor", "255, 255, 255"),
    },
    spectrographSolidColor: {
        type: OptionType.BOOLEAN,
        description: "Use a solid color for the spectrograph.",
        default: false,
    },
    spectrographColor: {
        type: OptionType.STRING,
        description: "Color for the spectrograph (R, G, B or #hex).",
        default: "33, 150, 243",
        onChange: value => validateColor(value, "spectrographColor", "33, 150, 243"),
    },
});

export default definePlugin({
    name: "BetterAudioPlayer",
    description: "Adds a spectrograph and oscilloscope visualizer to audio attachment players.",
    tags: ["Appearance", "Media", "Voice"],
    authors: [EquicordDevs.creations],
    settings,

    patches: [
        {
            find: "}renderPlayIcon(){",
            replacement: {
                match: /this\.renderAudio\(\):this\.renderVideo\(\)/,
                replace: "$&,$self.renderVisualizer(this)",
            },
        },
    ],

    renderVisualizer(player: PlayerInstance) {
        if (player.props.type !== "AUDIO") return null;
        return <Visualizer playerRef={player.mediaRef} src={player.props.src} key={player.props.src} />;
    },
});

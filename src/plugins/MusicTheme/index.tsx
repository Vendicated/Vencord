/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

//Types

interface Activity {
    type: number;
    name: string;
    details?: string;
    state?: string;
    assets?: {
        large_image?: string;
    };
}

interface PresenceDispatch {
    activities: Activity[];
}

//Settings

const settings = definePluginSettings({
    transitionDuration: {
        type: OptionType.NUMBER,
        description: "Background color transition duration in milliseconds",
        default: 1000,
        restartNeeded: false,
    },
    colorClusters: {
        type: OptionType.NUMBER,
        description: "Number of color clusters for k-means analysis (higher = more accurate, slower)",
        default: 4,
        restartNeeded: false,
    },
    enableSpotify: {
        type: OptionType.BOOLEAN,
        description: "React to Spotify activity",
        default: true,
        restartNeeded: false,
    },
    enableYouTubeMusic: {
        type: OptionType.BOOLEAN,
        description: "React to YouTube Music activity",
        default: true,
        restartNeeded: false,
    },
});

//Color Utilities

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h: number, s: number;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
            default: h = 0;
        }
        h /= 6;
    }
    return [h * 360, s * 100, l * 100];
}

function hslToCss(h: number, s: number, l: number): string {
    return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

async function vibrantColorFromUrl(
    url: string,
    k: number = 4,
    maxIterations: number = 10,
    sampleSize: number = 5000
): Promise<[number, number, number]> {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;

    return new Promise((resolve, reject) => {
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const scale = Math.min(1, Math.sqrt(sampleSize / (img.width * img.height)));
            canvas.width = Math.max(1, Math.floor(img.width * scale));
            canvas.height = Math.max(1, Math.floor(img.height * scale));

            const ctx = canvas.getContext("2d");
            if (!ctx) { reject(new Error("No canvas context")); return; }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const pixels: [number, number, number][] = [];
            const skippedPixels: [number, number, number][] = [];

            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 125) continue;
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const [, s, l] = rgbToHsl(r, g, b);

                if (s < 25 || l < 15 || l > 85) {
                    skippedPixels.push([r, g, b]);
                } else {
                    pixels.push([r, g, b]);
                }
            }

            const pool = pixels.length ? pixels : skippedPixels;
            if (!pool.length) { reject(new Error("No usable pixels")); return; }

            // k-means
            const centroids: [number, number, number][] = Array.from(
                { length: k },
                () => [...pool[Math.floor(Math.random() * pool.length)]] as [number, number, number]
            );
            const assignments = new Array<number>(pool.length);

            for (let iter = 0; iter < maxIterations; iter++) {
                for (let i = 0; i < pool.length; i++) {
                    let best = 0, minDist = Infinity;
                    for (let j = 0; j < k; j++) {
                        const dr = pool[i][0] - centroids[j][0];
                        const dg = pool[i][1] - centroids[j][1];
                        const db = pool[i][2] - centroids[j][2];
                        const dist = dr * dr + dg * dg + db * db;
                        if (dist < minDist) { minDist = dist; best = j; }
                    }
                    assignments[i] = best;
                }

                const sums: [number, number, number, number][] = Array.from({ length: k }, () => [0, 0, 0, 0]);
                for (let i = 0; i < pool.length; i++) {
                    const c = assignments[i];
                    sums[c][0] += pool[i][0];
                    sums[c][1] += pool[i][1];
                    sums[c][2] += pool[i][2];
                    sums[c][3]++;
                }
                for (let j = 0; j < k; j++) {
                    if (!sums[j][3]) continue;
                    centroids[j][0] = sums[j][0] / sums[j][3];
                    centroids[j][1] = sums[j][1] / sums[j][3];
                    centroids[j][2] = sums[j][2] / sums[j][3];
                }
            }


            const clusterStats = Array.from({ length: k }, () => ({ count: 0, score: 0 }));
            for (let i = 0; i < pool.length; i++) {
                const c = assignments[i];
                const [, s, l] = rgbToHsl(...pool[i]);
                clusterStats[c].count++;
                clusterStats[c].score += s * 0.7 + l * 0.3;
            }

            let bestCluster = 0, bestValue = -Infinity;
            for (let j = 0; j < k; j++) {
                if (!clusterStats[j].count) continue;
                const weighted = (clusterStats[j].score / clusterStats[j].count) * Math.log(clusterStats[j].count);
                if (weighted > bestValue) { bestValue = weighted; bestCluster = j; }
            }

            resolve(centroids[bestCluster].map(v => Math.round(v)) as [number, number, number]);
        };
        img.onerror = () => reject(new Error("Image load failed"));
    });
}

//CSS injection

const STYLE_ID = "MusicTheme-vencord";

function removeTheme() {
    document.getElementById(STYLE_ID)?.remove();
}

function applyTheme(r: number, g: number, b: number) {
    const [h, s, l] = rgbToHsl(r, g, b);
    const duration = settings.store.transitionDuration;

    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        document.head.appendChild(el);
    }

    el.textContent = `
        .theme-dark, .theme-dark *, .theme-light, .theme-light * {
            --neutral-72: var(--neutral-1);
            --neutral-76: var(--neutral-4);
            --neutral-43: var(--neutral-35);
            --neutral-47: var(--neutral-16);
            --neutral-41: var(--neutral-23);

            transition: background-color ${duration}ms ease-out !important;
            --background-base-low:     ${hslToCss(h, s, l * 0.50)} !important;
            --background-base-lower:   ${hslToCss(h, s, l * 0.30)} !important;
            --background-base-lowest:  ${hslToCss(h, s, l * 0.20)} !important;
            --background-surface-high: ${hslToCss(h, s, l * 0.45)} !important;
            --chat-background-default: ${hslToCss(h, s, l * 0.45)} !important;
        }
        .theme-dark *:hover, .theme-light *:hover {
            transition: background-color 10ms ease-out !important;
        }
    `;
}

//State

let lastSongDetails: string | null = null;

//Plugin

export default definePlugin({
    name: "MusicTheme",
    description: "Automatically changes Discord's theme colors based on the currently playing song's album artwork. Works with Spotify and YouTube Music.",
    authors: [
        { name: "Glitchy", id: 0n },
    ],
    settings,

    onPresenceChange(dispatch: PresenceDispatch) {
        const { enableSpotify, enableYouTubeMusic, colorClusters } = settings.store;

        const activity = dispatch.activities?.find(a => {
            if (a.type !== 2) return false;
            if (a.name === "Spotify" && enableSpotify) return true;
            if (a.name === "YouTube Music" && enableYouTubeMusic) return true;
            return false;
        });

        if (!activity?.assets?.large_image) {
            removeTheme();
            lastSongDetails = null;
            return;
        }


        if (activity.details === lastSongDetails) return;
        lastSongDetails = activity.details ?? null;

        let imageUrl: string;
        if (activity.name === "Spotify") {
            imageUrl = activity.assets.large_image.replace("spotify:", "https://i.scdn.co/image/");
        } else {

            const parts = activity.assets.large_image.split("/https/");
            if (!parts[1]) return;
            imageUrl = "https://" + parts[1];
        }

        console.log(`[MusicTheme] ${activity.details} by ${activity.state}`);

        vibrantColorFromUrl(imageUrl, colorClusters)
            .then(([r, g, b]) => applyTheme(r, g, b))
            .catch(e => console.warn("[MusicTheme]", e));
    },

    start() {
        this._handler = this.onPresenceChange.bind(this);
        FluxDispatcher.subscribe("SELF_PRESENCE_STORE_UPDATE", this._handler);
    },

    stop() {
        FluxDispatcher.unsubscribe("SELF_PRESENCE_STORE_UPDATE", this._handler);
        removeTheme();
        lastSongDetails = null;
    },
});

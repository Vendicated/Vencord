/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { GoogleFontMetadata } from "./types";

const loadedFontFamilies = new Set<string>(["Arial"]);
const loadingFontFamilies = new Map<string, Promise<void>>();

export const createGoogleFontUrl = (family: string, options = "") =>
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}${options}&display=swap`;

export function getFontFamilyCss(fontFamily: string) {
    const escaped = fontFamily.trim().replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    return `"${escaped || "Arial"}", sans-serif`;
}

export function getCanvasFont(size: number, fontFamily: string) {
    return `${size}px ${getFontFamilyCss(fontFamily)}`;
}

function parseFontFaces(css: string) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    const fontDisplays = new Set<FontDisplay>(["auto", "block", "fallback", "optional", "swap"]);

    return Array.from(sheet.cssRules)
        .filter((rule): rule is CSSFontFaceRule => rule.type === CSSRule.FONT_FACE_RULE)
        .map(rule => {
            const src = rule.style.getPropertyValue("src");
            const url = src.match(/url\((["']?)(.*?)\1\)/)?.[2];
            if (!url) return null;

            return {
                descriptors: {
                    display: fontDisplays.has(rule.style.getPropertyValue("font-display") as FontDisplay)
                        ? rule.style.getPropertyValue("font-display") as FontDisplay
                        : "swap",
                    stretch: rule.style.getPropertyValue("font-stretch") || undefined,
                    style: rule.style.getPropertyValue("font-style") || "normal",
                    unicodeRange: rule.style.getPropertyValue("unicode-range") || undefined,
                    weight: rule.style.getPropertyValue("font-weight") || "400"
                } satisfies FontFaceDescriptors,
                url
            };
        })
        .filter((face): face is NonNullable<typeof face> => face !== null);
}

async function loadFontFace(family: string, url: string, descriptors: FontFaceDescriptors) {
    try {
        const response = await fetch(url);
        if (!response.ok) return false;
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        try {
            const font = new FontFace(family, `url(${objectUrl})`, descriptors);
            await font.load();
            document.fonts.add(font);
            return true;
        } catch {
            return false;
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    } catch {
        return false;
    }
}

export function loadGoogleFont(fontFamily: string) {
    const family = fontFamily.trim();
    if (!family || loadedFontFamilies.has(family)) return Promise.resolve();

    const loading = loadingFontFamilies.get(family);
    if (loading) return loading;

    const loadPromise = (async () => {
        try {
            const response = await fetch(createGoogleFontUrl(family));
            if (!response.ok) return;
            const css = await response.text();
            if (!css) return;

            const faces = parseFontFaces(css);
            const results = await Promise.all(faces.map(face => loadFontFace(family, face.url, face.descriptors)));
            const loaded = results.some(Boolean);
            if (loaded) loadedFontFamilies.add(family);
        } catch {
            // font load failed silently
        }
    })();

    loadingFontFamilies.set(family, loadPromise);
    return loadPromise;
}

let cachedFonts: GoogleFontMetadata[] | null = null;
let fontsPromise: Promise<GoogleFontMetadata[]> | null = null;

export async function fetchAllGoogleFonts(): Promise<GoogleFontMetadata[]> {
    if (cachedFonts) return cachedFonts;
    if (fontsPromise) return fontsPromise;

    fontsPromise = fetch("https://fonts.google.com/$rpc/fonts.fe.catalog.actions.metadata.MetadataService/FontSearch", {
        body: JSON.stringify([["", null, null, null, null, null, 1], [5], null, 400]),
        headers: {
            "content-type": "application/json+protobuf",
            "x-user-agent": "grpc-web-javascript/0.1"
        },
        method: "POST"
    })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
            const rows = Array.isArray(data?.[1]) ? data[1] as unknown[] : [];
            const fonts: GoogleFontMetadata[] = [];

            for (const row of rows) {
                if (!Array.isArray(row) || !Array.isArray(row[1])) continue;

                const fontData = row[1] as unknown[];
                const family = typeof fontData[0] === "string" ? fontData[0] : "";
                if (!family || family.length > 100 || !/^[a-zA-Z0-9\s\-_']+$/.test(family)) continue;

                const displayName = typeof fontData[1] === "string" ? fontData[1] : family;
                const authors = Array.isArray(fontData[2])
                    ? fontData[2].filter((author): author is string => typeof author === "string")
                    : [];
                const category = typeof fontData[3] === "number" ? fontData[3] : undefined;
                const variants = Array.isArray(fontData[6])
                    ? fontData[6]
                        .filter((variant): variant is unknown[] => Array.isArray(variant))
                        .map(variant => {
                            const axesSource = Array.isArray(variant[0]) ? variant[0] as unknown[] : [];
                            const axes = axesSource
                                .filter((axis): axis is unknown[] => Array.isArray(axis))
                                .map(axis => {
                                    const tag = axis[0];
                                    const min = axis[1];
                                    const max = axis[2];

                                    if (typeof tag !== "string" || typeof min !== "number" || typeof max !== "number") {
                                        return null;
                                    }

                                    return { tag, min, max };
                                })
                                .filter((axis): axis is NonNullable<typeof axis> => axis !== null);

                            return { axes };
                        })
                    : [];

                fonts.push({
                    authors,
                    category,
                    displayName,
                    family,
                    popularity: 0,
                    variants
                });
            }

            fonts.sort((a, b) => a.family.localeCompare(b.family));
            cachedFonts = fonts;
            return fonts;
        })
        .catch(() => {
            cachedFonts = [];
            return cachedFonts;
        });

    return fontsPromise;
}

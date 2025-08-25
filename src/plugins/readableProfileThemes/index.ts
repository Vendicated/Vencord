/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { UserProfile } from "@vencord/discord-types";
import virtualMerge from "virtual-merge";

type Mode = "darken" | "lighten";

function toColorInt(x: unknown): number | null {
    if (typeof x !== "number" || !Number.isFinite(x)) return null;
    return Math.max(0, Math.floor(x)) & 0xffffff;
}

function intToRgb(c: number) {
    return { r: (c >> 16) & 0xff, g: (c >> 8) & 0xff, b: c & 0xff };
}

function rgbToInt(r: number, g: number, b: number) {
    return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

function rgbToHsl(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number) {
    h /= 360; s /= 100; l /= 100;
    const k = (n: number) => (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
        r: Math.round(255 * f(0)),
        g: Math.round(255 * f(8)),
        b: Math.round(255 * f(4))
    };
}

function clamp(x: number, min: number, max: number) {
    return Math.min(max, Math.max(min, x));
}

function normalizeColorInt(color: number, darken: boolean) {
    const { r, g, b } = intToRgb(color);
    let { h, s, l } = rgbToHsl(r, g, b);
    if (!darken) {
        if (s > 0) s = clamp(s * 1.08, 15, 72);
        l = clamp(l, 58, 82);
    } else {
        if (s > 0) s = clamp(s * 1.1, 20, 88);
        l = Math.min(l, 38);
    }
    const { r: nr, g: ng, b: nb } = hslToRgb(h, s, l);
    return rgbToInt(nr, ng, nb);
}

const settings = definePluginSettings({
    mode: {
        description: "How to make themes more readable",
        type: OptionType.SELECT,
        options: [
            { label: "Darken", value: "darken" as Mode, default: true },
            { label: "Lighten", value: "lighten" as Mode }
        ] as const
    }
});

export default definePlugin({
    name: "ReadableProfileThemes",
    description: "Normalizes profile theme colors to be easier on the eyes while keeping the hue.",
    authors: [Devs.mad3lyyn],
    settings,
    patches: [
        // Regex from fakeProfileThemes
        {
            find: "UserProfileStore",
            replacement: {
                match: /(?<=getUserProfile\(\i\){return )(.+?)(?=})/,
                replace: "$self.normalize($1)"
            }
        }
    ],
    normalize(user: UserProfile) {
        try {
            if (!user) return user;

            const rawThemeColors = (user as Partial<UserProfile> & { themeColors?: unknown; }).themeColors;
            if (!Array.isArray(rawThemeColors) || rawThemeColors.length < 2) return user;

            const primaryColor = toColorInt(rawThemeColors[0]);
            const accentColor = toColorInt(rawThemeColors[1]);
            if (primaryColor == null || accentColor == null) return user;

            const darken = settings.store.mode === "darken";

            const normalizedColors: [number, number] = [
                normalizeColorInt(primaryColor, darken),
                normalizeColorInt(accentColor, darken)
            ];

            return virtualMerge(user, {
                premiumType: 2,
                themeColors: normalizedColors
            });
        } catch {
            return user;
        }
    }
});

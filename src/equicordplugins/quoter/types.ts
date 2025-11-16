/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { User } from "@vencord/discord-types";

export enum QuoteFont {
    MPlusRounded = "M PLUS Rounded 1c",
    OpenSans = "Open Sans",
    MomoSignature = "Momo Signature",
    Lora = "Lora",
    Merriweather = "Merriweather"
}

export interface QuoteImageOptions {
    avatarUrl: string;
    quote: string;
    grayScale: boolean;
    author: User;
    watermark: string;
    showWatermark: boolean;
    saveAsGif: boolean;
    quoteFont: QuoteFont;
}

export interface CanvasConfig {
    width: number;
    height: number;
    quoteAreaWidth: number;
    quoteAreaX: number;
    maxContentHeight: number;
}

export interface FontSizeCalculation {
    fontSize: number;
    lineHeight: number;
    authorFontSize: number;
    usernameFontSize: number;
    lines: string[];
    totalHeight: number;
}

export const CANVAS_CONFIG: CanvasConfig = {
    width: 1200,
    height: 600,
    quoteAreaWidth: 520,
    quoteAreaX: 640,
    maxContentHeight: 480
};

export const FONT_SIZES = {
    initial: 42,
    minimum: 18,
    decrement: 2,
    lineHeightMultiplier: 1.25,
    authorMultiplier: 0.60,
    usernameMultiplier: 0.45,
    authorMinimum: 22,
    usernameMinimum: 18,
    watermark: 18
};

export const SPACING = {
    authorTop: 60,
    username: 10,
    gradientStart: 200,
    gradientWidth: 400,
    watermarkPadding: 20
};

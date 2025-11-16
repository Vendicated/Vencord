/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { User } from "@vencord/discord-types";
import { UserStore } from "@webpack/common";
import { applyPalette, GIFEncoder, quantize } from "gifenc";

import { CANVAS_CONFIG, CanvasConfig, FONT_SIZES, FontSizeCalculation, QuoteFont, QuoteImageOptions, SPACING } from "./types";

export function sizeUpgrade(url: string): string {
    const u = new URL(url);
    u.searchParams.set("size", "512");
    return u.toString();
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) return reject(new Error("Failed to create Blob"));
            resolve(blob);
        }, "image/png");
    });
}

export async function fetchImageAsBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    return await response.blob();
}

export function fixUpQuote(quote: string): string {
    let result = quote.replace(/<a?:(\w+):(\d+)>/g, "");
    const mentionMatches = result.match(/<@!?\d+>/g);
    if (mentionMatches) {
        mentionMatches.forEach(match => {
            const userId = match.replace(/[<@!>]/g, "");
            const user = UserStore.getUser(userId);
            if (user?.username) result = result.replace(match, `@${user.username}`);
        });
    }
    return result;
}

export function generateFileNamePreview(message: string): string {
    const words = message.split(" ");
    return words.length > 6 ? words.slice(0, 6).join(" ") : words.join(" ");
}

export function getFileExtension(saveAsGif: boolean): string {
    return saveAsGif ? "gif" : "png";
}

export function getMimeType(saveAsGif: boolean): string {
    return saveAsGif ? "image/gif" : "image/png";
}

let fontLoadingPromise: Promise<void> | null = null;

export async function ensureFontLoaded(): Promise<void> {
    if (fontLoadingPromise) return fontLoadingPromise;

    fontLoadingPromise = (async () => {
        if (!document.getElementById("quoter-font-style")) {
            const style = document.createElement("style");
            style.id = "quoter-font-style";
            style.textContent = `
                @import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@300&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Momo+Signature&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap');
            `;
            document.head.appendChild(style);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    })();

    return fontLoadingPromise;
}

export function resetFontLoading() {
    fontLoadingPromise = null;
}

async function canvasToGif(canvas: HTMLCanvasElement): Promise<Blob> {
    const gif = GIFEncoder();
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D rendering context");

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);

    gif.writeFrame(index, canvas.width, canvas.height, {
        transparent: false,
        palette,
    });

    gif.finish();
    return new Blob([new Uint8Array(gif.bytesView())], { type: "image/gif" });
}

async function loadAvatarImage(avatarUrl: string): Promise<HTMLImageElement> {
    const avatarBlob = await fetchImageAsBlob(avatarUrl);
    const avatar = new Image();
    const blobUrl = URL.createObjectURL(avatarBlob);

    try {
        await new Promise<void>((resolve, reject) => {
            avatar.onload = () => resolve();
            avatar.onerror = () => reject(new Error("Failed to load avatar image"));
            avatar.src = blobUrl;
        });
        return avatar;
    } finally {
        URL.revokeObjectURL(blobUrl);
    }
}

function applyGrayscaleFilter(ctx: CanvasRenderingContext2D, config: CanvasConfig): void {
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, config.width, config.height);
    ctx.globalCompositeOperation = "source-over";
}

function drawGradientOverlay(ctx: CanvasRenderingContext2D, config: CanvasConfig): void {
    const gradient = ctx.createLinearGradient(
        config.height - SPACING.gradientWidth,
        0,
        config.height,
        0
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(config.height - SPACING.gradientWidth, 0, SPACING.gradientWidth, config.height);
}

function calculateTextLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    fontSize: number,
    font: QuoteFont,
    maxWidth: number
): string[] {
    ctx.font = `300 ${fontSize}px '${font}', sans-serif`;
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine: string[] = [];

    words.forEach(word => {
        const testLine = [...currentLine, word].join(" ");
        if (ctx.measureText(testLine).width > maxWidth && currentLine.length) {
            lines.push(currentLine.join(" "));
            currentLine = [word];
        } else {
            currentLine.push(word);
        }
    });

    if (currentLine.length) {
        lines.push(currentLine.join(" "));
    }

    return lines;
}

function calculateOptimalFontSize(
    ctx: CanvasRenderingContext2D,
    quote: string,
    font: QuoteFont,
    config: CanvasConfig
): FontSizeCalculation {
    let fontSize = FONT_SIZES.initial;

    while (fontSize >= FONT_SIZES.minimum) {
        const lines = calculateTextLines(ctx, quote, fontSize, font, config.quoteAreaWidth);
        const lineHeight = fontSize * FONT_SIZES.lineHeightMultiplier;
        const authorFontSize = Math.max(FONT_SIZES.authorMinimum, fontSize * FONT_SIZES.authorMultiplier);
        const usernameFontSize = Math.max(FONT_SIZES.usernameMinimum, fontSize * FONT_SIZES.usernameMultiplier);

        const totalHeight = (lines.length * lineHeight) + SPACING.authorTop + authorFontSize + SPACING.username + usernameFontSize;

        if (totalHeight <= config.maxContentHeight) {
            return { fontSize, lineHeight, authorFontSize, usernameFontSize, lines, totalHeight };
        }
        fontSize -= FONT_SIZES.decrement;
    }

    const lines = calculateTextLines(ctx, quote, FONT_SIZES.minimum, font, config.quoteAreaWidth);
    const lineHeight = FONT_SIZES.minimum * FONT_SIZES.lineHeightMultiplier;
    const authorFontSize = FONT_SIZES.authorMinimum;
    const usernameFontSize = FONT_SIZES.usernameMinimum;
    const totalHeight = (lines.length * lineHeight) + SPACING.authorTop + authorFontSize + SPACING.username + usernameFontSize;

    return { fontSize: FONT_SIZES.minimum, lineHeight, authorFontSize, usernameFontSize, lines, totalHeight };
}

function drawQuoteText(
    ctx: CanvasRenderingContext2D,
    calculation: FontSizeCalculation,
    font: QuoteFont,
    config: CanvasConfig
): number {
    ctx.fillStyle = "#fff";
    ctx.font = `300 ${calculation.fontSize}px '${font}', sans-serif`;

    let quoteY = (config.height - calculation.totalHeight) / 2;

    calculation.lines.forEach(line => {
        const xOffset = (config.quoteAreaWidth - ctx.measureText(line).width) / 2;
        quoteY += calculation.lineHeight;
        ctx.fillText(line, config.quoteAreaX + xOffset, quoteY);
    });

    return quoteY;
}

function drawAuthorInfo(
    ctx: CanvasRenderingContext2D,
    author: User,
    calculation: FontSizeCalculation,
    config: CanvasConfig,
    startY: number
): void {
    const name = author.globalName || author.username;

    ctx.font = `italic 300 ${calculation.authorFontSize}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.fillStyle = "#fff";
    const authorText = `- ${name}`;
    const authorX = config.quoteAreaX + (config.quoteAreaWidth - ctx.measureText(authorText).width) / 2;
    const authorY = startY + SPACING.authorTop;
    ctx.fillText(authorText, authorX, authorY);

    ctx.font = `300 ${calculation.usernameFontSize}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.fillStyle = "#888";
    const username = `@${author.username}`;
    const usernameX = config.quoteAreaX + (config.quoteAreaWidth - ctx.measureText(username).width) / 2;
    const usernameY = authorY + SPACING.username + calculation.usernameFontSize;
    ctx.fillText(username, usernameX, usernameY);
}

function drawWatermark(
    ctx: CanvasRenderingContext2D,
    watermark: string,
    config: CanvasConfig
): void {
    ctx.fillStyle = "#888";
    ctx.font = `300 ${FONT_SIZES.watermark}px 'M PLUS Rounded 1c', sans-serif`;
    const watermarkText = watermark.slice(0, 32);
    const watermarkX = config.width - ctx.measureText(watermarkText).width - SPACING.watermarkPadding;
    const watermarkY = config.height - SPACING.watermarkPadding;
    ctx.fillText(watermarkText, watermarkX, watermarkY);
}

export async function createQuoteImage(options: QuoteImageOptions): Promise<Blob> {
    const { avatarUrl, quote: rawQuote, grayScale, author, watermark, showWatermark, saveAsGif, quoteFont } = options;

    await ensureFontLoaded();

    const quote = fixUpQuote(rawQuote);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D rendering context");

    canvas.width = CANVAS_CONFIG.width;
    canvas.height = CANVAS_CONFIG.height;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_CONFIG.width, CANVAS_CONFIG.height);

    const avatar = await loadAvatarImage(avatarUrl);
    ctx.drawImage(avatar, 0, 0, CANVAS_CONFIG.height, CANVAS_CONFIG.height);

    if (grayScale) {
        applyGrayscaleFilter(ctx, CANVAS_CONFIG);
    }

    drawGradientOverlay(ctx, CANVAS_CONFIG);

    const calculation = calculateOptimalFontSize(ctx, quote, quoteFont, CANVAS_CONFIG);
    const quoteEndY = drawQuoteText(ctx, calculation, quoteFont, CANVAS_CONFIG);
    drawAuthorInfo(ctx, author, calculation, CANVAS_CONFIG, quoteEndY);

    if (showWatermark && watermark) {
        drawWatermark(ctx, watermark, CANVAS_CONFIG);
    }

    return saveAsGif ? await canvasToGif(canvas) : await canvasToBlob(canvas);
}

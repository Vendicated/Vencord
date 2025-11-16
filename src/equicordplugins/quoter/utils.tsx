/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UserStore } from "@webpack/common";
import { applyPalette, GIFEncoder, quantize } from "gifenc";

export enum QuoteFont {
    MPlusRounded = "M PLUS Rounded 1c",
    OpenSans = "Open Sans",
    MomoSignature = "Momo Signature",
    Lora = "Lora",
    Merriweather = "Merriweather"
}

export interface QuoteImageOptions {
    avatarUrl: string;
    quoteOld: string;
    grayScale: boolean;
    author: {
        username: string;
        globalName?: string;
        id: string;
    };
    watermark?: string;
    showWatermark?: boolean;
    saveAsGif?: boolean;
    quoteFont?: QuoteFont;
}

export function sizeUpgrade(url: string) {
    const u = new URL(url);
    u.searchParams.set("size", "512");
    return u.toString();
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
            blob ? resolve(blob) : reject(new Error("Failed to create Blob"));
        }, "image/png");
    });
}

export async function fetchImageAsBlob(url: string): Promise<Blob> {
    if (!url) throw new Error("Invalid URL: URL is empty or undefined");
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        return await response.blob();
    } catch (error) {
        console.error("Error fetching image:", error);
        return new Blob([
            new Uint8Array([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
                0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
                0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
                0x42, 0x60, 0x82
            ])
        ], { type: "image/png" });
    }
}

export function FixUpQuote(quote: string) {
    try {
        quote = quote.replace(/<a?:(\w+):(\d+)>/g, "");
        const mentionMatch = /<@(.*?)>/.exec(quote);
        if (mentionMatch) {
            mentionMatch.forEach(match => {
                try {
                    const user = UserStore.getUser(match.replace(/[<@>]/g, ""));
                    if (user?.username) quote = quote.replace(match, `@${user.username}`);
                } catch { }
            });
        }
    } catch { }
    return quote;
}

export function generateFileNamePreview(message: string) {
    const words = message.split(" ");
    return words.length >= 6 ? words.slice(0, 6).join(" ") : words.join(" ");
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
    const ctx = canvas.getContext("2d")!;
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

export async function createQuoteImage(options: QuoteImageOptions): Promise<Blob> {
    const { avatarUrl, quoteOld, grayScale, author, watermark, showWatermark, saveAsGif, quoteFont } = options;

    await ensureFontLoaded();

    const quote = FixUpQuote(quoteOld);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cant get 2d rendering context :(");

    const name = author.globalName || author.username;
    const selectedQuoteFont = quoteFont || QuoteFont.MPlusRounded;

    const cardWidth = 1200;
    const cardHeight = 600;
    canvas.width = cardWidth;
    canvas.height = cardHeight;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    const avatarBlob = await fetchImageAsBlob(avatarUrl);
    const avatar = new Image();

    await new Promise<void>(resolve => {
        avatar.onload = () => resolve();
        avatar.src = URL.createObjectURL(avatarBlob);
    });

    ctx.drawImage(avatar, 0, 0, cardHeight, cardHeight);

    if (grayScale) {
        ctx.globalCompositeOperation = "saturation";
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, cardWidth, cardHeight);
        ctx.globalCompositeOperation = "source-over";
    }

    const gradient = ctx.createLinearGradient(cardHeight - 400, 0, cardHeight, 0);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(cardHeight - 400, 0, 400, cardHeight);

    const quoteWidth = cardWidth / 2 - 80;
    const quoteX = cardWidth - cardHeight + 40;
    const maxContentHeight = cardHeight * 0.8;

    const calculateLines = (text: string, fontSize: number): string[] => {
        ctx.font = `300 ${fontSize}px '${selectedQuoteFont}', sans-serif`;
        const words = text.split(" ");
        const lines: string[] = [];
        let currentLine: string[] = [];

        words.forEach(word => {
            const testLine = [...currentLine, word].join(" ");
            if (ctx.measureText(testLine).width > quoteWidth && currentLine.length > 0) {
                lines.push(currentLine.join(" "));
                currentLine = [word];
            } else {
                currentLine.push(word);
            }
        });

        if (currentLine.length > 0) {
            lines.push(currentLine.join(" "));
        }

        return lines;
    };

    let fontSize = 42;
    let lineHeight = fontSize * 1.25;
    let lines: string[] = [];
    let authorFontSize = 30;
    let usernameFontSize = 22;
    let totalHeight = 0;

    while (fontSize >= 18) {
        lines = calculateLines(quote, fontSize);
        lineHeight = fontSize * 1.25;
        authorFontSize = Math.max(22, fontSize * 0.60);
        usernameFontSize = Math.max(18, fontSize * 0.45);
        const spacing = 60;
        const usernameSpacing = 10;
        totalHeight = (lines.length * lineHeight) + spacing + authorFontSize + usernameSpacing + usernameFontSize;

        if (totalHeight <= maxContentHeight) {
            break;
        }
        fontSize -= 2;
    }

    ctx.fillStyle = "#fff";
    ctx.font = `300 ${fontSize}px '${selectedQuoteFont}', sans-serif`;

    let quoteY = (cardHeight - totalHeight) / 2;

    lines.forEach(line => {
        const xOffset = (quoteWidth - ctx.measureText(line).width) / 2;
        quoteY += lineHeight;
        ctx.fillText(line, quoteX + xOffset, quoteY);
    });

    ctx.font = `italic 300 ${authorFontSize}px 'M PLUS Rounded 1c', sans-serif`;
    const authorText = `- ${name}`;
    const authorNameX = quoteX + (quoteWidth - ctx.measureText(authorText).width) / 2;
    const authorNameY = quoteY + 50;
    ctx.fillText(authorText, authorNameX, authorNameY);

    const username = `@${author.username}`;
    ctx.font = `300 ${usernameFontSize}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.fillStyle = "#888";
    const usernameX = quoteX + (quoteWidth - ctx.measureText(username).width) / 2;
    const usernameY = authorNameY + 10 + usernameFontSize;
    ctx.fillText(username, usernameX, usernameY);

    if (showWatermark && watermark) {
        ctx.fillStyle = "#888";
        ctx.font = "300 18px 'M PLUS Rounded 1c', sans-serif";
        const watermarkText = watermark.slice(0, 32);
        const watermarkX = cardWidth - ctx.measureText(watermarkText).width - 20;
        const watermarkY = cardHeight - 20;
        ctx.fillText(watermarkText, watermarkX, watermarkY);
    }

    return saveAsGif ? await canvasToGif(canvas) : await canvasToBlob(canvas);
}

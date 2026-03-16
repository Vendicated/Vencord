/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const TEENS = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALES = ["", "Thousand", "Million", "Billion", "Trillion"];

function underThousandToWords(value: number): string {
    const hundreds = Math.floor(value / 100);
    const tensAndOnes = value % 100;
    const parts: string[] = [];

    if (hundreds > 0) {
        parts.push(`${ONES[hundreds]} Hundred`);
    }

    if (tensAndOnes >= 10 && tensAndOnes <= 19) {
        parts.push(TEENS[tensAndOnes - 10]);
    } else {
        const tens = Math.floor(tensAndOnes / 10);
        const ones = tensAndOnes % 10;
        if (tens > 0) parts.push(TENS[tens]);
        if (ones > 0) parts.push(ONES[ones]);
    }

    return parts.join(" ").trim();
}

export function numberToWords(value: number): string {
    if (!Number.isFinite(value)) return "";
    if (value === 0) return "Zero";

    const negative = value < 0;
    let remaining = Math.trunc(Math.abs(value));
    const chunks: string[] = [];
    let scaleIndex = 0;

    while (remaining > 0 && scaleIndex < SCALES.length) {
        const chunk = remaining % 1000;
        if (chunk > 0) {
            const words = underThousandToWords(chunk);
            const scale = SCALES[scaleIndex];
            chunks.unshift(scale ? `${words} ${scale}` : words);
        }
        remaining = Math.floor(remaining / 1000);
        scaleIndex += 1;
    }

    const result = chunks.join(" ").trim();
    if (!result) return "";
    return negative ? `Negative ${result}` : result;
}

export function formatNumber(value: number): string {
    if (Number.isNaN(value)) return "NaN";
    if (value === Number.POSITIVE_INFINITY) return "Infinity";
    if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 12
    }).format(value);
}

export function formatRawNumber(value: number): string {
    if (Number.isNaN(value)) return "NaN";
    if (value === Number.POSITIVE_INFINITY) return "Infinity";
    if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
    const normalized = Number(value.toFixed(12));
    return String(normalized);
}

export function formatTime24(hour: number, minute: number): string {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatTime12(hour: number, minute: number): string {
    const period = hour >= 12 ? "PM" : "AM";
    const converted = hour % 12 || 12;
    return `${converted}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatDurationMinutes(minutes: number): { display: string; raw: string; } {
    const abs = Math.abs(minutes);
    if (abs < 60) {
        const rounded = Number(abs.toFixed(2));
        return {
            display: `${rounded} ${rounded === 1 ? "minute" : "minutes"}`,
            raw: String(rounded)
        };
    }

    const hours = abs / 60;
    if (Number.isInteger(hours)) {
        return {
            display: `${hours} ${hours === 1 ? "hour" : "hours"}`,
            raw: String(hours)
        };
    }

    const rounded = Number(hours.toFixed(2));
    return {
        display: `${rounded} hours`,
        raw: String(rounded)
    };
}

export function formatDateMedium(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

export function formatTimespanMinutes(totalMinutes: number): string {
    const sign = totalMinutes < 0 ? "-" : "";
    let remaining = Math.abs(Math.round(totalMinutes));
    const days = Math.floor(remaining / 1440);
    remaining %= 1440;
    const hours = Math.floor(remaining / 60);
    const minutes = remaining % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    return `${sign}${parts.join(" ")}`;
}

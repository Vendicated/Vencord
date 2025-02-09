/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function cl(className: string) {
    return `vc-analyze-${className}`;
}

export type AnalysisValue = {
    details: Array<{
        message: string;
        type: "safe" | "suspicious" | "malicious" | "neutral";
    }>;
    timestamp: number;
};

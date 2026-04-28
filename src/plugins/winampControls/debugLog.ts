/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Debug logging utility that respects the plugin's debug setting
// This runs in the renderer process and can access settings

let debugEnabled = false;

export function setDebugEnabled(enabled: boolean): void {
    debugEnabled = enabled;
}

export function isDebugEnabled(): boolean {
    return debugEnabled;
}

export function debugLog(prefix: string, ...args: any[]): void {
    if (debugEnabled) {
        console.log(`[${prefix}]`, ...args);
    }
}

export function debugError(prefix: string, ...args: any[]): void {
    // Errors are always logged regardless of debug setting
    console.error(`[${prefix}]`, ...args);
}

export function debugWarn(prefix: string, ...args: any[]): void {
    if (debugEnabled) {
        console.warn(`[${prefix}]`, ...args);
    }
}

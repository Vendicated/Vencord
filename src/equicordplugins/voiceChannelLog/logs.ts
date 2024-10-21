/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface VoiceChannelLogEntry {
    userId: string;
    username: string;
    oldChannel: string | null;
    newChannel: string | null;
    timestamp: Date;
}

export const vcLogs = new Map<string, VoiceChannelLogEntry[]>();
let vcLogSubscriptions: (() => void)[] = [];

export function getVcLogs(channel?: string): VoiceChannelLogEntry[] {
    if (!channel) return [];
    if (!vcLogs.has(channel)) vcLogs.set(channel, []);
    return vcLogs.get(channel) || [];
}

export function addLogEntry(logEntry: VoiceChannelLogEntry, channel?: string) {
    if (!channel) return;
    vcLogs.set(channel, [...getVcLogs(channel), logEntry]);
    vcLogSubscriptions.forEach(u => u());
}

export function clearLogs(channel?: string) {
    if (!channel) return;
    vcLogs.set(channel, []);
    vcLogSubscriptions.forEach(u => u());
}

export function vcLogSubscribe(listener: () => void) {
    vcLogSubscriptions = [...vcLogSubscriptions, listener];
    return () => {
        vcLogSubscriptions = vcLogSubscriptions.filter(l => l !== listener);
    };
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Shared whitelist management for Stalker and StalkerV2
 * Both plugins use the same targets list from the original Stalker plugin
 */

let targets: string[] = [];
let settingsStore: any = null;

export function initSharedTargets(settings: any): void {
    settingsStore = settings;
    parseTargets();
}

export function parseTargets(): void {
    if (!settingsStore) {
        targets = [];
        return;
    }
    targets = settingsStore.targets ? settingsStore.targets.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
}

export function getTargets(): string[] {
    return targets;
}

export function addTarget(userId: string): void {
    if (!targets.includes(userId)) {
        targets.push(userId);
        if (settingsStore) {
            settingsStore.targets = targets.join(", ");
        }
    }
}

export function removeTarget(userId: string): void {
    targets = targets.filter(id => id !== userId);
    if (settingsStore) {
        settingsStore.targets = targets.join(", ");
    }
}

export function isTarget(userId: string): boolean {
    return targets.includes(userId);
}

export function setTargets(userIds: string[]): void {
    targets = userIds;
    if (settingsStore) {
        settingsStore.targets = targets.join(", ");
    }
}

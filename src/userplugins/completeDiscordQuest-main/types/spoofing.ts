/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const SpoofingSpeedMode = {
    BALANCED: "balanced",
    SPEEDRUN: "speedrun",
    STEALTH: "stealth",
} as const;

export type SpoofingSpeedMode = (typeof SpoofingSpeedMode)[keyof typeof SpoofingSpeedMode];

export interface SpoofingProfile {
    video: {
        maxFuture: number;
        speed: number;
        interval: number;
    };
    playActivity: {
        intervalMs: number;
    };
}

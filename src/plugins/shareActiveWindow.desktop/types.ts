/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface CandidateGame {
    readonly cmdLine: string;
    readonly elevated: boolean;
    readonly exeName: string;
    readonly exePath: string;
    readonly fullscreenType: number;
    readonly hidden: boolean;
    readonly isLauncher: boolean;
    readonly name: string;
    readonly pid: number;
    readonly pidPath: number[];
    readonly sandboxed: boolean;
    readonly windowHandle: string;
}

export interface StreamSettings {
    preset?: number;
    fps?: number;
    resolution?: number;
    soundshareEnabled?: boolean;
    previewDisabled?: boolean;
    audioSourceId?: string;
    goLiveModalDurationMs?: number;
    analyticsLocations?: string[];
    sourceId?: string;
}

export interface StreamUpdateSettingsEvent {
    readonly frameRate: number;
    readonly preset: number;
    readonly resolution: number;
    readonly soundshareEnabled: boolean;
}

export interface StreamStartEvent {
    readonly analyticsLocations: string[];
    readonly appContext: string;
    readonly audioSourceId: string;
    readonly channelId: string;
    readonly goLiveModalDurationMs: number;
    readonly guildId: string;
    readonly previewDisabled: boolean;
    readonly sound: boolean;
    readonly sourceIcon: string;
    readonly sourceId: string;
    readonly sourceName: string;
    readonly streamType: string;
}

export interface MediaEngineSetGoLiveSourceEvent {
    readonly settings: {
        readonly context?: string;
        readonly desktopSettings?: {
            readonly sourceId?: string;
            readonly sound?: boolean;
        };
        readonly qualityOptions?: {
            readonly frameRate?: number;
            readonly preset?: number;
            readonly resolution?: number;
        };
    };
}

export interface WindowDescriptor {
    readonly id: string;
    readonly url?: string;
    readonly icon: string;
    readonly name: string;
}

export interface RtcConnectionStateEvent {
    readonly channelId: string;
    readonly context: string;
    readonly hostname: string;
    readonly state: "RTC_DISCONNECTED";
}

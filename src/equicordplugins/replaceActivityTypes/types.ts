/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type AppIdSetting = {
    appName: string;
    appId: string;
    swapNameAndDetails: boolean;
    activityType: ActivityType;
    streamUrl: string;
    enabled: boolean;
};

export interface Activity {
    state: string;
    details: string;
    timestamps?: {
        start?: number;
        end?: number;
    };
    url?: string;
    assets: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: number;
}

export interface ActivityAssets {
    large_image: string;
    large_text: string;
    small_image: string;
    small_text: string;
}

export const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5
}

export interface SettingsProps {
    appIds: AppIdSetting[];
    update: () => void;
    save: () => void;
}

export interface RpcApp {
    id: string;
    name: string;
    icon: string;
    flags: number;
}

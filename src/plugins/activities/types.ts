/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ActivityProps {
    className: string;
    textClassName: string;
    emojiClassName: string;
    activities: Activity[];
    applicationStream: null;
    animate: boolean;
    hideEmoji: boolean;
    hideTooltip: boolean;
}

export interface Activity {
    created_at: string;
    id: string;
    name: string;
    state?: string;
    type: ActivityType;
    assets?: Assets;
    flags?: number;
    platform?: string;
    timestamps?: Timestamps;
    details?: string;
    party?: Party;
    session_id?: string;
    sync_id?: string;
}

export enum ActivityType {
    Playing = 0,
    Streaming = 1,
    Listening = 2,
    Watching = 3,
    CustomStatus = 4,
    Competing = 5,
}

export interface Assets {
    small_image?: string;
    large_image?: string;
    large_text?: string;
}

export interface Party {
    id: string;
}

export interface Timestamps {
    start: string;
    end?: string;
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PropsWithChildren } from "react";

export interface Emote {
    id: string;
    name: string;
    animated: boolean;
}

export enum ExpressionPickerView {
    GIF = "gif",
    SEVEN_TV = "7tv",
}

export interface ExpressionPickerTabProps extends PropsWithChildren {
    id?: string;
    "aria-controls"?: string;
    "aria-selected"?: boolean;
    isActive?: boolean;
    viewType: ExpressionPickerView;
}

export interface SevenTVChannel {
    key: string;
    id: string;
    name: string;
    avatarUrl?: string;
    emotes: Emote[];
}

export interface SevenTVEmote {
    id: string;
    name: string;
    data?: {
        animated?: boolean;
    };
}

export interface SevenTVConnection {
    platform?: string;
    emote_set?: {
        emotes?: SevenTVEmote[];
    };
}

export interface SevenTVUserResponse {
    id?: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
    connections?: SevenTVConnection[];
    emote_set?: {
        emotes?: SevenTVEmote[];
    };
}

export interface SevenTVGraphQLUser {
    id: string;
    username?: string;
    display_name?: string;
}

export interface SevenTVGraphQLSearchResponse {
    data?: {
        users?: SevenTVGraphQLUser[];
    };
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { User } from "discord-types/general";

export interface UserProfile extends User {
    themeColors: [number, number] | undefined;
    profileEffectID: string | undefined;
}

export interface ProfileEffect {
    accessibilityLabel: string;
    animationType: number;
    description: string;
    effects: {
        duartion: number;
        height: number;
        loop: boolean;
        loopDelay: number;
        position: {
            x: number;
            y: number;
        };
        src: string;
        start: number;
        width: number;
        zIndex: number;
    }[];
    id: string;
    reducedMotionSrc: string;
    sku_id: string;
    staticFrameSrc?: string;
    thumbnailPreviewSrc: string;
    title: string;
    type: number;
}

export type RGBColor = [number, number, number];

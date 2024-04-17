/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { User } from "discord-types/general";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";

export interface UserProfile extends User {
    themeColors: [number, number] | undefined;
    profileEffectId: string | undefined;
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

export type CustomizationSection = ComponentType<PropsWithChildren<{
    title?: ReactNode;
    titleIcon?: ReactNode;
    titleId?: string;
    description?: ReactNode;
    className?: string;
    errors?: string[];
    disabled?: boolean;
    hideDivider?: boolean;
    showBorder?: boolean;
    borderType?: "limited" | "premium";
    hasBackground?: boolean;
    forcedDivider?: boolean;
    showPremiumIcon?: boolean;
}>>;

export type ColorPicker = ComponentType<{
    value?: number | null;
    onChange: (v: number) => void;
    onClose?: () => void;
    suggestedColors?: string[];
    middle?: ReactNode;
    footer?: ReactNode;
    showEyeDropper?: boolean;
}>;

export type RGBColor = [number, number, number];

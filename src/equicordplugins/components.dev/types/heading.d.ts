/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { HeadingVariantType, TextColorType, TextVariantType } from "../constants";

export type HeadingVariant = HeadingVariantType;
export type TextVariant = TextVariantType;
export type TextColor = TextColorType | "currentColor" | "none" | "always-white";

export interface DiscordHeadingProps {
    variant: HeadingVariant;
    className?: string;
    color?: TextColor;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}

export interface DiscordTextProps {
    variant: TextVariant;
    color?: TextColor;
    tag?: string;
    selectable?: boolean;
    lineClamp?: number;
    tabularNumbers?: boolean;
    scaleFontToUserSetting?: boolean;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}

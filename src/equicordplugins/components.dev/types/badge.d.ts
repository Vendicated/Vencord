/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface BadgeShapesType {
    ROUND: string;
    ROUND_LEFT: string;
    ROUND_RIGHT: string;
    SQUARE: string;
}

export interface NumberBadgeProps {
    count: number;
    color?: string;
    disableColor?: boolean;
    shape?: string;
    className?: string;
    style?: React.CSSProperties;
    renderBadgeCount?: (count: number) => string;
}

export interface TextBadgeProps {
    text: string;
    color?: string;
    disableColor?: boolean;
    shape?: string;
    className?: string;
    style?: React.CSSProperties;
}

export interface IconBadgeProps {
    icon: React.ComponentType<{ className?: string; color?: string; }>;
    color?: string;
    disableColor?: boolean;
    shape?: string;
    className?: string;
    style?: React.CSSProperties;
}

export interface CircleBadgeProps {
    color?: string;
    disableColor?: boolean;
    shape?: string;
    className?: string;
    style?: React.CSSProperties;
}

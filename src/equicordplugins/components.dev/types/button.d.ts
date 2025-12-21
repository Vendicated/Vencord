/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ManaButtonProps {
    text?: string;
    variant?: "primary" | "secondary" | "critical-primary" | "critical-secondary" | "overlay-primary" | "overlay-secondary" | "expressive";
    size?: "xs" | "sm" | "md";
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    rounded?: boolean;
    icon?: React.ComponentType<any>;
    iconPosition?: "start" | "end";
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

export interface ManaTextButtonProps {
    text: string;
    variant?: "primary" | "secondary" | "always-white" | "critical";
    textVariant?: string;
    lineClamp?: number;
    onClick?: () => void;
    disabled?: boolean;
}

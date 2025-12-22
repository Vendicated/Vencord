/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ManaButtonSize, ManaButtonVariant, ManaTextButtonVariant } from "../constants";

export type { ManaButtonSize, ManaButtonVariant, ManaTextButtonVariant };

export type ManaButtonIconType =
    | React.ComponentType<any>
    | { type: "icon"; asset: React.ComponentType<any>; }
    | { type: "rive"; asset: React.ComponentType<any>; riveProps?: Record<string, any>; }
    | { type: "sticker"; asset: any; component: React.ComponentType<any>; };

export interface ManaButtonProps {
    text?: string;
    variant?: ManaButtonVariant;
    size?: ManaButtonSize;
    disabled?: boolean;
    loading?: boolean;
    loadingStartedLabel?: string;
    loadingFinishedLabel?: string;
    fullWidth?: boolean;
    rounded?: boolean;
    icon?: ManaButtonIconType;
    iconPosition?: "start" | "end";
    iconOpticalOffsetMargin?: number;
    minWidth?: number | string;
    role?: string;
    type?: "button" | "submit" | "reset";
    rel?: string;
    onClick?: (e: React.MouseEvent) => void;
    onDoubleClick?: (e: React.MouseEvent) => void;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onMouseUp?: (e: React.MouseEvent) => void;
    onMouseDown?: (e: React.MouseEvent) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    focusProps?: Record<string, any>;
    buttonRef?: React.Ref<HTMLButtonElement>;
    className?: string;
    style?: React.CSSProperties;
}

export interface ManaTextButtonProps {
    text: string;
    variant?: ManaTextButtonVariant;
    textVariant?: string;
    lineClamp?: number;
    role?: string;
    type?: "button" | "submit" | "reset";
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    focusProps?: Record<string, any>;
    buttonRef?: React.Ref<HTMLButtonElement>;
    className?: string;
    style?: React.CSSProperties;
}

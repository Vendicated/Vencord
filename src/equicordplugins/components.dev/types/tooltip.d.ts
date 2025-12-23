/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PopoverSize, TooltipAlign, TooltipColor, TooltipPosition } from "../constants";

export type { PopoverSize, TooltipAlign, TooltipColor, TooltipPosition };

export interface ManaTooltipProps {
    text: string | (() => React.ReactNode);
    position?: TooltipPosition;
    align?: TooltipAlign;
    color?: TooltipColor;
    spacing?: number;
    hideOnClick?: boolean;
    delay?: number;
    forceOpen?: boolean;
    shouldShow?: boolean;
    allowOverflow?: boolean;
    overflowOnly?: boolean;
    clickableOnMobile?: boolean;
    disableTooltipPointerEvents?: boolean;
    targetElementRef?: React.RefObject<HTMLElement>;
    tooltipClassName?: string;
    tooltipStyle?: React.CSSProperties;
    tooltipContentClassName?: string;
    tooltipPointerClassName?: string;
    onTooltipShow?: () => void;
    onTooltipHide?: () => void;
    onAnimationRest?: () => void;
    "aria-label"?: string | false;
    children: (props: Record<string, any>) => React.ReactNode;
}

export interface ManaRichTooltipProps {
    title?: string;
    body: string;
    asset?: React.ReactNode | { src: string; alt?: string; };
    assetSize?: number;
    asContainer?: boolean;
    element?: "span" | "div";
    position?: TooltipPosition;
    align?: TooltipAlign;
    spacing?: number;
    caretConfig?: { align?: "start" | "center" | "end"; };
    layerContext?: any;
    targetElementRef?: React.RefObject<HTMLElement>;
    anchorRef?: React.RefObject<HTMLElement>;
    positionKey?: string;
    ariaHidden?: boolean;
    children: React.ReactNode | ((props: Record<string, any>) => React.ReactNode);
}

export interface PopoverAction {
    text: string;
    onClick?: () => void;
    variant?: "primary" | "secondary";
}

export interface ManaPopoverProps {
    title?: string;
    body?: string;
    badge?: React.ReactNode;
    graphic?: { src: string; aspectRatio?: string; };
    size?: PopoverSize;
    actions?: PopoverAction[];
    textLink?: { text: string; onClick?: () => void; };
    gradientColor?: string;
    onRequestClose?: (reason: string) => void;
    targetElementRef: React.RefObject<HTMLElement | null>;
    shouldShow: boolean;
    position?: TooltipPosition;
    alignmentStrategy?: "edge" | "trigger-center";
    align?: "left" | "center" | "right";
}

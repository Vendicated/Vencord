/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ManaTooltipProps {
    text: string;
    position?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
    color?: "primary" | "black" | "grey" | "brand" | "green" | "yellow" | "red";
    spacing?: number;
    hideOnClick?: boolean;
    delay?: number;
    children: (props: any) => React.ReactNode;
}

export interface ManaRichTooltipProps {
    title?: string;
    body: string;
    asset?: React.ReactNode | { src: string; alt?: string; };
    assetSize?: number;
    asContainer?: boolean;
    element?: "span" | "div";
    position?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
    spacing?: number;
    ariaHidden?: boolean;
    children: React.ReactNode | ((props: any) => React.ReactNode);
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
    size?: "sm" | "md" | "lg";
    actions?: PopoverAction[];
    textLink?: { text: string; onClick?: () => void; };
    gradientColor?: string;
    onRequestClose?: (reason: string) => void;
    targetElementRef: React.RefObject<HTMLElement | null>;
    shouldShow: boolean;
    position?: "top" | "bottom" | "left" | "right";
    alignmentStrategy?: "edge" | "trigger-center";
    align?: "left" | "center" | "right";
}

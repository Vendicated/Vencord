/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type PopoutAnimationType = "1" | "2" | "3" | "4";

export type PopoutPosition = "top" | "bottom" | "left" | "right" | "center" | "window_center";

export type PopoutAlign = "left" | "right" | "center" | "top" | "bottom";

export interface PopoutChildrenProps {
    "aria-controls": string;
    "aria-expanded": boolean;
    onClick: (event: React.MouseEvent<HTMLElement>) => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
    onMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
}

export interface PopoutChildrenData {
    isShown: boolean;
    position: PopoutPosition;
}

export interface PopoutRenderProps {
    closePopout: () => void;
    isPositioned: boolean;
    nudge: number;
    position: PopoutPosition;
    setPopoutRef: (ref: any) => void;
    updatePosition: () => void;
}

export interface PopoutProps {
    children: (props: PopoutChildrenProps, data: PopoutChildrenData) => React.ReactNode;
    renderPopout: (props: PopoutRenderProps) => React.ReactNode;
    shouldShow?: boolean;
    targetElementRef?: React.RefObject<HTMLElement>;
    onRequestOpen?: () => void;
    onRequestClose?: () => void;
    align?: PopoutAlign;
    animation?: PopoutAnimationType;
    animationPosition?: PopoutPosition;
    autoInvert?: boolean;
    nudgeAlignIntoViewport?: boolean;
    position?: PopoutPosition;
    positionKey?: string;
    popoutKey?: string;
    spacing?: number;
    preload?: boolean;
    fixed?: boolean;
    useRawTargetDimensions?: boolean;
    onShiftClick?: () => void;
    disablePointerEvents?: boolean;
    ignoreModalClicks?: boolean;
    scrollBehavior?: string;
    useMouseEnter?: boolean;
    layerContext?: any;
    clickTrap?: boolean;
}

export interface PopoutAnimationEnum {
    NONE: "1";
    TRANSLATE: "2";
    SCALE: "3";
    FADE: "4";
}

export type PopoutComponent = React.ComponentType<PopoutProps> & {
    Animation: PopoutAnimationEnum;
};

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import { findByPropsLazy } from "@webpack";

import type { QuestButtonDisplayMode, QuestButtonIndicatorMode } from "../settings/def";

export interface RGB {
    r: number;
    g: number;
    b: number;
}

export const QUEST_PAGE = "/quest-home";
export const q = classNameFactory("questify-");
export const leftClick = 0;
export const middleClick = 1;
export const rightClick = 2;

export function decimalToRGB(decimal: number): RGB {
    return {
        r: (decimal >> 16) & 0xff,
        g: (decimal >> 8) & 0xff,
        b: decimal & 0xff,
    };
}

export function adjustRGB(rgb: RGB, shift: number): RGB {
    return {
        r: Math.max(0, Math.min(255, rgb.r + shift)),
        g: Math.max(0, Math.min(255, rgb.g + shift)),
        b: Math.max(0, Math.min(255, rgb.b + shift)),
    };
}

export function isDarkish(rgb: RGB, threshold: number = 0.5): boolean {
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

    return luminance < threshold;
}

export function canShowBadge(mode: QuestButtonIndicatorMode): boolean {
    return mode === "badge" || mode === "both";
}

export function canShowPill(mode: QuestButtonIndicatorMode): boolean {
    return mode === "pill" || mode === "both";
}

export function canShowButton(mode: QuestButtonDisplayMode): boolean {
    return mode === "always" || mode === "unclaimed";
}

export interface AlertOptions {
    title: string;
    body: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: "primary" | "critical-primary" | "expressive";
    onConfirm?: () => void;
    onCancel?: () => void;
    onCloseCallback?: () => void;
    contextKey?: string;
}

export interface AlertsType {
    show: (options: AlertOptions) => void;
    close: () => void;
    confirm: (options: AlertOptions) => Promise<boolean>;
}

const AlertsModule = findByPropsLazy("show", "close", "confirm");

export const Alerts: AlertsType = {
    show: options => AlertsModule.show(options),
    close: () => AlertsModule.close(),
    confirm: options => AlertsModule.confirm(options),
};

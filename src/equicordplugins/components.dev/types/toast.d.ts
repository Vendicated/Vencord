/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type ToastTypeValue = "message" | "success" | "failure" | "custom" | "clip" | "link" | "forward" | "bookmark" | "clock";

export type ToastPositionValue = 0 | 1;

export interface ToastOptions {
    duration?: number;
    position?: ToastPositionValue;
    component?: React.ReactNode;
    appContext?: number;
}

export interface ToastData {
    message: string;
    type: ToastTypeValue;
    id: string;
    options?: ToastOptions;
}

export interface ToastsModule {
    Type: Record<string, ToastTypeValue>;
    Position: Record<string, ToastPositionValue>;
    genId: () => string;
    show: (data: ToastData) => void;
    pop: () => void;
    create: (message: string, type: ToastTypeValue, options?: ToastOptions) => ToastData;
}

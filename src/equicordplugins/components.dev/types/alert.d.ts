/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

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

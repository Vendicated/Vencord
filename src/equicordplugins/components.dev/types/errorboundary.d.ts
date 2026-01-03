/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ComponentType, ErrorInfo, ReactNode } from "react";

export interface ErrorBoundaryFallbackProps {
    error: Error;
    resetErrorBoundary: (...args: any[]) => void;
}

export interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    fallbackRender?: (props: ErrorBoundaryFallbackProps) => ReactNode;
    FallbackComponent?: ComponentType<ErrorBoundaryFallbackProps>;
    onError?: (error: Error, info: ErrorInfo) => void;
    onReset?: (details: { reason: "imperative-api" | "keys"; args?: any[]; prev?: any[]; next?: any[]; }) => void;
    resetKeys?: any[];
}

export interface SimpleErrorBoundaryProps {
    children: ReactNode;
    fallback: ReactNode;
}

export interface LocalErrorBoundaryProps {
    children: ReactNode;
}

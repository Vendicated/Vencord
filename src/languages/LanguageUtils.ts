/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ReactNode } from "react";

export function formatWithReactComponent(
    text: string,
    params?: Record<string, ReactNode>
): ReactNode[] {
    if (!params) return [text];

    return text.split(/(\{\w+\})/g).map((part, i) => {
        const match = part.match(/^\{(\w+)\}$/);
        if (match) {
            const key = match[1];
            return key in params ? params[key] : part;
        }
        return part;
    });
}

export function formatText(text: string, params?: Record<string, any>): string {
    if (!params) return text;

    return text.replace(/\{(\w+)\}/g, (_, key) => {
        return params[key] !== undefined ? String(params[key]) : `{${key}}`;
    });
}

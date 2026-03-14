/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ComponentType } from "react";

export function makeIconFromUrl(iconUrl?: string): ComponentType<{ className?: string; size?: string; }> | undefined {
    if (!iconUrl) return undefined;

    return function IconFromUrl({ className, size }) {
        const parsed = Number.parseInt(size ?? "18", 10);
        const base = Number.isFinite(parsed) ? parsed : 18;
        const dimension = Math.max(22, base + 8);

        return (
            <img
                src={iconUrl}
                alt=""
                className={className}
                width={dimension}
                height={dimension}
                style={{
                    borderRadius: "50%",
                    objectFit: "cover"
                }}
            />
        );
    };
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function TextCorrectorIcon({
    height = 24,
    width = 24,
    color = "currentColor",
}: {
    height?: number;
    width?: number;
    color?: string;
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            height={height}
            width={width}
            fill={color}
        >
            <path d="M3 2v20h18V2H3zm16 18H5V4h14v16z" />
            <path d="M9 12h6v2H9z" />
        </svg>
    );
}

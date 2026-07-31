/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DEFAULT_TAG_SHAPE, TagShape } from "./data";

const ROUNDING_RADIUS = 12;
const BORDER_WIDTH = 4;

const EXTRA_SIZE = (ROUNDING_RADIUS + BORDER_WIDTH) * 0.5;

function getBorderColor(color: string) {
    return `color-mix(in oklab, ${color}, contrast-color(${color}) 80%)`;
}

function BaseShape({ shape }: { shape: TagShape; }) {
    if (shape === "circle") return <circle cx="5" cy="5" r="5" />;
    if (shape === "triangle") return <path d="M5 0 10 10H0z" />;
    return <path d="M0 0 h10 v10 H0 z" />;
}

export function TagShapeIcon({
    className,
    color,
    shape = DEFAULT_TAG_SHAPE
}: {
    className?: string;
    color: string;
    shape?: TagShape;
}) {
    const borderColor = getBorderColor(color);

    return (
        <svg
            aria-hidden="true"
            className={className}
            viewBox={`${-EXTRA_SIZE} ${-EXTRA_SIZE} ${10 + EXTRA_SIZE * 2} ${10 + EXTRA_SIZE * 2}`}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g
                fill={borderColor}
                stroke={borderColor}
                strokeLinejoin="round"
                strokeWidth={ROUNDING_RADIUS + BORDER_WIDTH}
            >
                <BaseShape shape={shape} />
            </g>
            <g
                fill={color}
                stroke={color}
                strokeLinejoin="round"
                strokeWidth={ROUNDING_RADIUS}
            >
                <BaseShape shape={shape} />
            </g>
        </svg>
    );
}

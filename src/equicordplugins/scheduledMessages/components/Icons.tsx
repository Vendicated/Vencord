/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

interface IconProps {
    width?: number | string;
    height?: number | string;
    className?: string;
    color?: string;
}

export function CalendarIcon({ width = 20, height = 20, className, color }: IconProps) {
    return (
        <svg
            aria-hidden="true"
            role="img"
            width={width}
            height={height}
            className={className}
            viewBox="0 0 24 24"
        >
            <g fill="none" fillRule="evenodd">
                <path
                    fill={color ?? "currentColor"}
                    d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"
                />
                <rect width="24" height="24" />
            </g>
        </svg>
    );
}

export function TimerIcon({ width = 20, height = 20, className }: IconProps) {
    return (
        <svg
            aria-hidden="true"
            role="img"
            width={width}
            height={height}
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
        </svg>
    );
}

export function ErrorIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
    );
}

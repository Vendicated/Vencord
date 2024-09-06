/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function TimerIcon({ height = 16, width = 16, className }: Readonly<{
    height?: number;
    width?: number;
    className?: string;
}>) {
    return (
        <svg
            viewBox="0 0 455 455"
            height={height}
            width={width}
            className={className}
            style={{ color: "var(--channels-default)" }}
        >
            <path fill="currentColor" d="M332.229,90.04l14.238-27.159l-26.57-13.93L305.67,76.087c-19.618-8.465-40.875-13.849-63.17-15.523V30h48.269V0H164.231v30
        H212.5v30.563c-22.295,1.674-43.553,7.059-63.171,15.523L135.103,48.95l-26.57,13.93l14.239,27.16
        C67.055,124.958,30,186.897,30,257.5C30,366.576,118.424,455,227.5,455S425,366.576,425,257.5
        C425,186.896,387.944,124.958,332.229,90.04z M355,272.5H212.5V130h30v112.5H355V272.5z"/>
        </svg>
    );
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function AnalyzeIcon({ height = 24, width = 24, className }) {
    return (
        <svg
            viewBox="0 0 24 24"
            height={height}
            width={width}
            className={className}
        >
        <path fill="currentColor" d="M12 2L4 5V12C4 16.97 7.58 21.43 12 22C16.42 21.43 20 16.97 20 12V5L12 2ZM12 4L18 6.5V12C18 16.05 14.87 19.54 12 20C9.13 19.54 6 16.05 6 12V6.5L12 4ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z"/>
  </svg>
    );
}

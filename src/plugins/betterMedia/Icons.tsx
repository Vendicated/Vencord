/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IconComponent } from "@utils/types";

export const GalleryIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg
        viewBox="0 0 24 24"
        width={width}
        height={height}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            fill="currentColor"
            d="M4 4a2 2 0 0 0-2 2v3h6V4H4Zm6 0v5h6V4h-6Zm8 0v5h6V6a2 2 0 0 0-2-2h-4ZM2 11v3h6v-3H2Zm8 0v3h6v-3h-6Zm8 0v3h6v-3h-6ZM2 16v3a2 2 0 0 0 2 2h4v-5H2Zm8 0v5h6v-5h-6Zm8 0v5h4a2 2 0 0 0 2-2v-3h-6Z"
        />
    </svg>
);

export const PlayIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg viewBox="0 0 24 24" width={width} height={height} className={className}>
        <path fill="currentColor" d="M8 5.14v13.72c0 .8.87 1.29 1.55.88l10.9-6.86a1 1 0 0 0 0-1.76L9.55 4.26A1 1 0 0 0 8 5.14Z" />
    </svg>
);

export const FileIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg viewBox="0 0 24 24" width={width} height={height} className={className}>
        <path
            fill="currentColor"
            d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.83a2 2 0 0 0-.59-1.42l-4.82-4.82A2 2 0 0 0 13.17 2H6Zm7 1.5V7a2 2 0 0 0 2 2h3.5L13 3.5Z"
        />
    </svg>
);

export const LinkIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg viewBox="0 0 24 24" width={width} height={height} className={className}>
        <path
            fill="currentColor"
            d="M13.06 8.11a5 5 0 0 1 0 7.07l-3.54 3.54a5 5 0 0 1-7.07-7.07l1.77-1.77a1 1 0 1 1 1.41 1.41L3.87 12.6a3 3 0 0 0 4.24 4.24l3.54-3.53a3 3 0 0 0 0-4.25 1 1 0 0 1 1.41-1.41ZM10.94 15.9a5 5 0 0 1 0-7.08l3.54-3.53a5 5 0 0 1 7.07 7.07l-1.77 1.77a1 1 0 1 1-1.41-1.41l1.77-1.77a3 3 0 1 0-4.24-4.24l-3.54 3.53a3 3 0 0 0 0 4.25 1 1 0 1 1-1.42 1.41Z"
        />
    </svg>
);

export const PinIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg viewBox="0 0 24 24" width={width} height={height} className={className}>
        <path
            fill="currentColor"
            d="M14.83 2.34a1 1 0 0 1 1.41 0l5.42 5.42a1 1 0 0 1 0 1.41l-1.77 1.77a1 1 0 0 1-1.06.23l-1.34-.5-3.1 3.1.72 3.4a1 1 0 0 1-.27.92l-1.06 1.06a1 1 0 0 1-1.41 0l-3.3-3.3-4.84 4.84a1 1 0 0 1-1.41-1.41l4.84-4.84-3.3-3.3a1 1 0 0 1 0-1.41l1.06-1.06a1 1 0 0 1 .92-.27l3.4.72 3.1-3.1-.5-1.34a1 1 0 0 1 .23-1.06l1.77-1.78Z"
        />
    </svg>
);

export const DownloadIcon: IconComponent = ({ height = 16, width = 16, className }) => (
    <svg viewBox="0 0 24 24" width={width} height={height} className={className}>
        <path
            fill="currentColor"
            d="M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1ZM5 19a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H5Z"
        />
    </svg>
);

export const JumpIcon: IconComponent = ({ height = 16, width = 16, className }) => (
    <svg viewBox="0 0 24 24" width={width} height={height} className={className}>
        <path
            fill="currentColor"
            d="M9.3 5.3a1 1 0 0 0 0 1.4l5.29 5.3-5.3 5.3a1 1 0 1 0 1.42 1.4l6-6a1 1 0 0 0 0-1.4l-6-6a1 1 0 0 0-1.42 0Z"
        />
    </svg>
);

export const CloseIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg viewBox="0 0 24 24" width={width} height={height} className={className}>
        <path
            fill="currentColor"
            d="M18.3 5.71a1 1 0 0 0-1.42-1.42L12 9.17 7.11 4.3A1 1 0 0 0 5.7 5.7L10.59 12l-4.9 4.89a1 1 0 1 0 1.42 1.42L12 14.83l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89Z"
        />
    </svg>
);

export const ChevronIcon: IconComponent = ({ height = 24, width = 24, className }) => (
    <svg viewBox="0 0 24 24" width={width} height={height} className={className}>
        <path
            fill="currentColor"
            d="M15.7 5.3a1 1 0 0 1 0 1.4L10.42 12l5.3 5.3a1 1 0 0 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.42 0Z"
        />
    </svg>
);

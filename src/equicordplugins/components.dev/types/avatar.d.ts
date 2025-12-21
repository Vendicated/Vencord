/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type AvatarSize = "SIZE_16" | "SIZE_20" | "SIZE_24" | "SIZE_32" | "SIZE_40" | "SIZE_48" | "SIZE_56" | "SIZE_80" | "SIZE_120";

export type AvatarStatus = "online" | "idle" | "dnd" | "offline" | "streaming";

export interface AvatarProps {
    src?: string;
    size?: AvatarSize;
    status?: AvatarStatus;
    statusColor?: string;
    isMobile?: boolean;
    isTyping?: boolean;
    isSpeaking?: boolean;
    statusTooltip?: boolean;
    statusTooltipDelay?: number;
    "aria-hidden"?: boolean;
    "aria-label"?: string;
    imageClassName?: string;
    className?: string;
}

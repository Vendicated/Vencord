/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { AvatarSize, AvatarStatus } from "../constants";

export type { AvatarSize, AvatarStatus };

export interface AvatarSizeConfig {
    size: number;
    status: number;
    stroke: number;
    offset: number;
}

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
    avatarDecoration?: string;
    "aria-hidden"?: boolean;
    "aria-label"?: string;
    imageClassName?: string;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}

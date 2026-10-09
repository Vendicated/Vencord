/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findComponentByCodeLazy } from "@webpack";
import type { ComponentType } from "react";

export interface DiscordIconProps {
    size?: "xxs" | "xs" | "sm" | "md" | "lg" | "refresh_sm";
    width?: number;
    height?: number;
    color?: string;
    className?: string;
}

export const GiftIcon: ComponentType<DiscordIconProps> =
    findComponentByCodeLazy("M4 6a4 4 0 0 1 4-4h.09c1.8 0 3.39 1.18 3.91 2.9");

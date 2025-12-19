/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Icon } from "@vencord/discord-types";

export type IconsDef = Record<string, Icon>;

export interface CssColorData {
    name: string;
    css: string;
    key: string;
}

export type IconSize = "xxs" | "xs" | "sm" | "md" | "lg";

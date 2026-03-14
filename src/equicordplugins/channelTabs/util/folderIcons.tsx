/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Icon } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";

const iconsModule = findByPropsLazy("AngleBracketsIcon", "StaffBadgeIcon") as Record<string, Icon>;

let iconNames: string[] | undefined;

export function getDiscordFolderIcon(name?: string): Icon | undefined {
    if (!name) return;

    const icon = iconsModule[name];
    return typeof icon === "function" && name.endsWith("Icon") ? icon : undefined;
}

export function getDiscordFolderIconNames(): string[] {
    if (iconNames) return iconNames;

    iconNames = Object.keys(iconsModule)
        .filter(name => name.endsWith("Icon") && typeof iconsModule[name] === "function")
        .sort((a, b) => a.localeCompare(b));

    return iconNames;
}

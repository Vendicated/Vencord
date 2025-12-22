/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface GuildIconProps {
    guildId: string;
    guildName: string;
    guildIcon: string | null;
    iconSize: number;
    className?: string;
    acronymClassName?: string;
    animate?: boolean;
}

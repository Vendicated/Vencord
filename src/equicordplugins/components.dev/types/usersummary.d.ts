/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { User } from "@vencord/discord-types";

export type UserSummarySize = 16 | 24 | 32 | 56;

export interface UserSummaryItemProps {
    users: (User | null)[];
    max?: number;
    count?: number;
    size?: UserSummarySize;
    guildId?: string;
    showUserPopout?: boolean;
    showDefaultAvatarsForNullUsers?: boolean;
    renderUser?: (user: User | null, isLast: boolean, index: number) => React.ReactNode;
    renderMoreUsers?: (text: string, count: number) => React.ReactNode;
    renderIcon?: boolean;
    renderLeadingIcon?: (className: string) => React.ReactNode;
    dimEmptyUsers?: boolean;
    hideMoreUsers?: boolean;
    useFallbackUserForPopout?: boolean;
    extraDetail?: React.ReactNode;
    className?: string;
}

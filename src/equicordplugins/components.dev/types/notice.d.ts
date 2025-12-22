/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { NoticeTypeValue } from "../constants";

export type NoticeType = NoticeTypeValue;

export interface NoticeProps {
    children: React.ReactNode;
    messageType: NoticeType;
    action?: React.ReactNode;
    className?: string;
    textColor?: string;
    textVariant?: string;
    icon?: React.ComponentType<{ className?: string; color?: string; }>;
    hidden?: boolean;
}

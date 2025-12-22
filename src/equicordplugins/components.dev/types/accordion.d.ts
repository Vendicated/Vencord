/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface AccordionProps {
    icon?: React.ReactNode;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    isExpanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    defaultExpanded?: boolean;
    onOpen?: () => void;
    maxHeight?: number | string;
}

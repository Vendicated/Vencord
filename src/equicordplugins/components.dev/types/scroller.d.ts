/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ScrollerProps {
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    orientation?: "vertical" | "horizontal";
    fade?: boolean;
    dir?: "ltr" | "rtl";
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export interface ListScrollerProps extends ScrollerProps {
    rowHeight: number;
    sections: number[];
    sectionHeight: number;
    renderSection: (section: number) => React.ReactNode;
    renderRow: (row: { section: number; row: number }) => React.ReactNode;
    role?: string;
}

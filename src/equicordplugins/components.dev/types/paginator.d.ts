/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface PaginatorPageWrapperProps {
    key: string;
    targetPage: number;
    selected: boolean;
    navigateToPage: () => void;
}

export interface PaginatorProps {
    currentPage: number;
    totalCount: number;
    pageSize: number;
    maxVisiblePages?: number;
    disablePaginationGap?: boolean;
    onPageChange?: (page: number) => void;
    hideMaxPage?: boolean;
    className?: string;
    renderPageWrapper?: (props: PaginatorPageWrapperProps, defaultRender: React.ReactNode) => React.ReactNode;
}

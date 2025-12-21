/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface TabBarProps {
    className?: string;
    children?: React.ReactNode;
    type?: "side" | "top" | "top-pill";
    look?: "brand" | "grey";
    style?: React.CSSProperties;
    selectedItem?: string;
    onItemSelect?: (id: string) => void;
    orientation?: "horizontal" | "vertical";
    "aria-label"?: string;
}

export interface TabBarItemProps {
    id: string;
    className?: string;
    children?: React.ReactNode;
    selectedItem?: string;
    onItemSelect?: (id: string) => void;
    itemType?: "side" | "top" | "top-pill";
    look?: "brand" | "grey";
    color?: string;
    variant?: "destructive";
    disabled?: boolean;
    disableItemStyles?: boolean;
    onClick?: React.MouseEventHandler;
    onContextMenu?: React.MouseEventHandler;
    clickableRef?: React.Ref<HTMLElement>;
    clickableInnerRef?: React.Ref<HTMLElement>;
    "aria-label"?: string;
}

export interface TabBarHeaderProps {
    className?: string;
    children?: React.ReactNode;
    onClick?: React.MouseEventHandler;
    "aria-expanded"?: boolean;
    "aria-controls"?: string;
}

export interface TabBarSeparatorProps {
    style?: React.CSSProperties;
}

export type TabBarComponent = React.ComponentType<TabBarProps> & {
    Item: React.ComponentType<TabBarItemProps>;
    Header: React.ComponentType<TabBarHeaderProps>;
    Separator: React.ComponentType<TabBarSeparatorProps>;
    Panel: React.ComponentType<{ children?: React.ReactNode; }>;
};

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ComponentType, CSSProperties, MouseEvent, ReactNode, Ref, UIEvent } from "react";

export type MenuItemColor = "default" | "brand" | "danger" | "premium" | "premium-gradient" | "success";

export type MenuIconSize = "sm" | "md" | "lg";

export interface MenuProps {
    navId: string;
    onClose: () => void;
    onSelect?: () => void;
    onInteraction?: (data: { type: number; }) => void;
    variant?: "flexible" | "fixed";
    hideScroller?: boolean;
    className?: string;
    style?: CSSProperties;
    "aria-label"?: string;
    children: ReactNode;
}

export interface MenuItemIconProps {
    color?: string;
    className?: string;
}

export interface MenuItemProps {
    id: string;
    label: ReactNode | ((props: MenuItemProps) => ReactNode);
    color?: MenuItemColor;
    icon?: ComponentType<MenuItemIconProps>;
    iconLeft?: ComponentType<MenuItemIconProps>;
    iconLeftSize?: MenuIconSize;
    iconProps?: MenuItemIconProps;
    hint?: ReactNode | ((props: MenuItemProps) => ReactNode);
    subtext?: ReactNode;
    subtextLineClamp?: number;
    hasSubmenu?: boolean;
    disabled?: boolean;
    action?: (e: MouseEvent) => void;
    dontCloseOnAction?: boolean;
    dontCloseOnActionIfHoldingShiftKey?: boolean;
    className?: string;
    focusedClassName?: string;
    subMenuIconClassName?: string;
    render?: (props: MenuItemProps) => ReactNode;
    navigable?: boolean;
    onChildrenScroll?: () => void;
    childRowHeight?: number;
    listClassName?: string;
    subMenuClassName?: string;
    children?: ReactNode;
}

export interface MenuCheckboxItemProps {
    id: string;
    label: ReactNode | ((props: MenuCheckboxItemProps) => ReactNode);
    color?: MenuItemColor;
    checked: boolean;
    action?: (e: MouseEvent) => void;
    disabled?: boolean;
    subtext?: ReactNode;
    className?: string;
    focusedClassName?: string;
}

export interface MenuRadioItemProps {
    id: string;
    group: string;
    label: ReactNode | ((props: MenuRadioItemProps) => ReactNode);
    color?: MenuItemColor;
    checked: boolean;
    action?: (e: MouseEvent) => void;
    disabled?: boolean;
    subtext?: ReactNode;
}

export interface MenuSwitchItemProps {
    id: string;
    label?: ReactNode;
    color?: MenuItemColor;
    checked: boolean;
    action: (e: MouseEvent) => void;
    disabled?: boolean;
    className?: string;
}

export interface MenuGroupProps {
    label?: ReactNode;
    color?: MenuItemColor;
    className?: string;
    children: ReactNode;
}

export interface MenuCustomItemRenderProps {
    color: MenuItemColor;
    disabled: boolean;
    isFocused: boolean;
}

export interface MenuCustomItemProps {
    id: string;
    color?: MenuItemColor;
    disabled?: boolean;
    keepItemStyles?: boolean;
    action?: (e: MouseEvent) => void;
    dontCloseOnAction?: boolean;
    dontCloseOnActionIfHoldingShiftKey?: boolean;
    navigable?: boolean;
    children: (props: MenuCustomItemRenderProps) => ReactNode;
}

export interface MenuControlItemControlProps {
    onClose: () => void;
    disabled?: boolean;
    isFocused: boolean;
    onInteraction: (type?: number) => void;
}

export interface MenuControlItemProps {
    id: string;
    label?: ReactNode;
    color?: MenuItemColor;
    control: (props: MenuControlItemControlProps, ref: Ref<MenuControlRef>) => ReactNode;
    disabled?: boolean;
    showDefaultFocus?: boolean;
}

export interface MenuCompositeControlItemProps {
    id: string;
    color?: MenuItemColor;
    disabled?: boolean;
    showDefaultFocus?: boolean;
    interactive?: boolean;
    children: ReactNode;
}

export interface MenuControlRef {
    focus: () => void;
    blur: () => void;
    activate: () => boolean;
}

export interface MenuSliderControlProps {
    value: number;
    minValue?: number;
    maxValue?: number;
    onChange: (value: number) => void;
    renderValue?: (value: number) => string;
    "aria-label"?: string;
}

export interface MenuSearchControlProps {
    query: string;
    onChange: (query: string) => void;
    placeholder?: string;
    "aria-label"?: string;
}

export interface MenuType {
    Menu: ComponentType<MenuProps>;
    MenuItem: ComponentType<MenuItemProps>;
    MenuCheckboxItem: ComponentType<MenuCheckboxItemProps>;
    MenuRadioItem: ComponentType<MenuRadioItemProps>;
    MenuSwitchItem: ComponentType<MenuSwitchItemProps>;
    MenuGroup: ComponentType<MenuGroupProps>;
    MenuSeparator: ComponentType<Record<string, never>>;
    MenuControlItem: ComponentType<MenuControlItemProps>;
    MenuSliderControl: ComponentType<MenuSliderControlProps>;
    MenuSearchControl: ComponentType<MenuSearchControlProps>;
}

export interface ContextMenuOpenOptions {
    enableSpellCheck?: boolean;
}

export interface ContextMenuApiType {
    openContextMenu: (
        event: UIEvent,
        render: (props: { onClose: () => void; }) => ReactNode,
        options?: ContextMenuOpenOptions
    ) => void;
    openContextMenuLazy: (
        event: UIEvent,
        renderLazy: () => Promise<(props: { onClose: () => void; }) => ReactNode>,
        options?: ContextMenuOpenOptions
    ) => void;
    closeContextMenu: (callback?: () => void) => void;
}

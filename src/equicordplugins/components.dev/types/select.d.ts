/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ManaSelectOption {
    id: string;
    value: string;
    label: string;
}

export interface ManaSelectProps {
    options: ManaSelectOption[];
    value?: string | string[] | null;
    onSelectionChange?: (value: string | string[] | null) => void;
    selectionMode?: "single" | "multiple";
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    clearable?: boolean;
    fullWidth?: boolean;
    autoFocus?: boolean;
    closeOnSelect?: boolean;
    shouldFocusWrap?: boolean;
    maxOptionsVisible?: number;
    wrapTags?: boolean;
    formatOption?: (option: ManaSelectOption) => React.ReactNode;
    name?: string;
    form?: string;
    autoComplete?: string;
    label?: string;
    required?: boolean;
}

export interface ManaComboboxProps<T = string> {
    placeholder?: string;
    value?: T | T[];
    onChange?: (value: T | T[]) => void;
    multiSelect?: boolean;
    autoFocus?: boolean;
    maxVisibleItems?: number;
    itemToString?: (item: T) => string;
    emptyStateText?: string;
    emptyStateHeader?: string;
    onQueryChange?: (query: string) => void;
    "aria-label"?: string;
    className?: string;
    listClassName?: string;
    children: (query: string) => React.ReactNode[];
}

export interface ListboxItem {
    id: string;
    label: string;
    disabled?: boolean;
}

export interface ManaListboxProps {
    items: ListboxItem[];
    selectedItems?: ListboxItem[];
    defaultSelectedItems?: ListboxItem[];
    onSelectionChange?: (items: ListboxItem[]) => void;
    selectionMode?: "single" | "multiple";
    disabled?: boolean;
    required?: boolean;
    loading?: boolean;
    maxVisibleItems?: number;
    shouldFocusWrap?: boolean;
    typeahead?: boolean;
    renderListItem?: (item: ListboxItem) => React.ReactNode;
    renderEmptyState?: () => React.ReactNode;
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ManaCheckboxProps {
    checked: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    displayOnly?: boolean;
    label?: string;
    description?: string;
    leadingIcon?: React.ComponentType<any>;
    labelType?: "primary" | "secondary";
    usageVariant?: "single" | "indicator";
}

export interface CheckboxGroupOption {
    value: string | number;
    label: string;
    description?: string;
    disabled?: boolean;
    leadingIcon?: React.ComponentType<any>;
}

export interface ManaCheckboxGroupProps {
    options: CheckboxGroupOption[];
    selectedValues: (string | number)[];
    onChange?: (values: (string | number)[]) => void;
    disabled?: boolean;
}

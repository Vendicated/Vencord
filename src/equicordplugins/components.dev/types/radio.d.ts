/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface RadioOption {
    value: string | number;
    name: string;
    desc?: string;
    disabled?: boolean;
    leadingIcon?: React.ComponentType<{ className?: string; size?: string; color?: string; }>;
}

export interface ManaBaseRadioGroupProps {
    options: RadioOption[];
    value?: string | number;
    onChange?: (value: string | number) => void;
    disabled?: boolean;
    label?: string;
    "aria-labelledby"?: string;
}

export interface StandaloneRadioIndicatorProps {
    isSelected: boolean;
    disabled?: boolean;
}

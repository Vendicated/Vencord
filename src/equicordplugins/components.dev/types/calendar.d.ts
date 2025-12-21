/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ManaCalendarProps {
    value?: any;
    onChange?: (value: any) => void;
    minValue?: any;
    maxValue?: any;
    disabled?: boolean;
    readOnly?: boolean;
    className?: string;
    "aria-label"?: string;
}

export interface ManaDatePickerProps {
    value?: any;
    onChange?: (value: any) => void;
    minValue?: any;
    maxValue?: any;
    placeholderValue?: any;
    granularity?: "day" | "hour" | "minute" | "second";
    hourCycle?: 12 | 24;
    hideTimeZone?: boolean;
    disabled?: boolean;
    required?: boolean;
    label?: string;
    description?: string;
    errorMessage?: string;
}

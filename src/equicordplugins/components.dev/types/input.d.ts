/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ManaTextInputProps {
    value: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    size?: "sm" | "md";
    error?: boolean;
    clearable?: boolean;
    showCharacterCount?: boolean;
    maxLength?: number;
}

export interface ManaTextAreaProps {
    value: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    rows?: number;
    autosize?: boolean;
    maxLength?: number;
    showCharacterCount?: boolean;
}

export interface SearchBarProps {
    query: string;
    onChange: (value: string) => void;
    onClear?: () => void;
    placeholder?: string;
    size?: "sm" | "md";
    autoFocus?: boolean;
    disabled?: boolean;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    onBlur?: () => void;
    onFocus?: () => void;
    autoComplete?: string;
    inputProps?: Record<string, any>;
    "aria-label"?: string;
}

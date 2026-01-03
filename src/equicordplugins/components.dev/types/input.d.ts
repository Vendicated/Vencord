/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { TextInputSize } from "../constants";

export type { TextInputSize };

export type TextInputLeadingAccessory =
    | string
    | React.ComponentType<any>
    | { icon: React.ComponentType<any>; tooltip?: string; }
    | { button: React.ReactNode; }
    | { type: "tags"; tags: string[]; onRemove?: (tag: string) => void; }
    | { type: "image"; src: string; };

export type TextInputTrailingAccessory =
    | React.ComponentType<any>
    | { icon: React.ComponentType<any>; tooltip?: string; }
    | { button: React.ReactNode; };

export interface ManaTextInputProps {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string, name?: string) => void;
    onClear?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    placeholder?: string;
    name?: string;
    type?: "text" | "password" | "email" | "number" | "search" | "tel" | "url";
    disabled?: boolean;
    readOnly?: boolean;
    editable?: boolean;
    size?: TextInputSize;
    error?: string | boolean;
    clearable?: boolean | { show: boolean; };
    showCharacterCount?: boolean;
    maxLength?: number;
    minLength?: number;
    fullWidth?: boolean;
    leading?: TextInputLeadingAccessory;
    trailing?: TextInputTrailingAccessory;
    validateOn?: "change" | "blur";
    defaultDirty?: boolean;
    focusProps?: Record<string, any>;
    inputRef?: React.Ref<HTMLInputElement>;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
}

export interface ManaTextAreaProps {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string, name?: string) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    placeholder?: string;
    name?: string;
    disabled?: boolean;
    readOnly?: boolean;
    rows?: number;
    autoFocus?: boolean;
    autosize?: boolean;
    maxLength?: number;
    minLength?: number;
    showCharacterCount?: boolean;
    showRemainingCharacterCount?: boolean;
    error?: string | boolean;
    defaultDirty?: boolean;
    fullWidth?: boolean;
    focusProps?: Record<string, any>;
    inputRef?: React.Ref<HTMLTextAreaElement>;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
}

export interface SearchBarProps {
    query: string;
    onChange: (value: string) => void;
    onClear?: () => void;
    placeholder?: string;
    size?: TextInputSize;
    autoFocus?: boolean;
    disabled?: boolean;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    onBlur?: () => void;
    onFocus?: () => void;
    autoComplete?: string;
    inputProps?: Record<string, any>;
    className?: string;
    "aria-label"?: string;
}

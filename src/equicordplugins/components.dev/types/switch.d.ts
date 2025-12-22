/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ManaSwitchProps {
    checked: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
    hasIcon?: boolean;
    focusProps?: Record<string, any>;
    describedBy?: string;
    labelledBy?: string;
    innerRef?: React.Ref<HTMLInputElement>;
}

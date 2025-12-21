/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ClickableProps extends React.HTMLAttributes<HTMLElement> {
    tag?: keyof React.JSX.IntrinsicElements;
    focusProps?: Record<string, unknown>;
    innerRef?: React.Ref<HTMLElement>;
    onClick?: React.MouseEventHandler<HTMLElement>;
    role?: string;
    tabIndex?: number;
    ignoreKeyPress?: boolean;
    className?: string;
    children?: React.ReactNode;
    href?: string;
    onKeyPress?: React.KeyboardEventHandler<HTMLElement>;
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface AnchorProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href?: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    className?: string;
    children?: React.ReactNode;
    rel?: string;
    target?: string;
    useDefaultUnderlineStyles?: boolean;
    title?: string;
    style?: React.CSSProperties;
    focusProps?: Record<string, unknown>;
    ref?: React.Ref<HTMLAnchorElement>;
}

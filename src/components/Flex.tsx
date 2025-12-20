/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CSSProperties, HTMLAttributes } from "react";

export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
    flexDirection?: CSSProperties["flexDirection"];
    gap?: CSSProperties["gap"];
    justifyContent?: CSSProperties["justifyContent"];
    alignItems?: CSSProperties["alignItems"];
    flexWrap?: CSSProperties["flexWrap"];
}

export function Flex({ flexDirection, gap = "1em", justifyContent, alignItems, flexWrap, children, style, ...restProps }: FlexProps) {
    style = {
        display: "flex",
        flexDirection,
        gap,
        justifyContent,
        alignItems,
        flexWrap,
        ...style
    };

    return (
        <div style={style} {...restProps}>
            {children}
        </div>
    );
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText, type BaseTextProps } from "./BaseText";

export type SpanProps = BaseTextProps<"span">;

export function Span({ children, size = "sm", weight = "normal", ...restProps }: SpanProps) {
    return (
        <BaseText tag="span" size={size} weight={weight} {...restProps}>
            {children}
        </BaseText>
    );
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText, BaseTextProps } from "./BaseText";

export type SpanProps = BaseTextProps<"span">;

export function Span(props: SpanProps) {
    return (
        <BaseText tag="span" size="sm" weight="normal" {...props}>
            {props.children}
        </BaseText>
    );
}

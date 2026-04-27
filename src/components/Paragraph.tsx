/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText, type BaseTextProps } from "./BaseText";

export type ParagraphProps = BaseTextProps<"p">;

export function Paragraph({ children, ...restProps }: ParagraphProps) {
    return (
        <BaseText tag="p" size="sm" weight="normal" {...restProps}>
            {children}
        </BaseText>
    );
}

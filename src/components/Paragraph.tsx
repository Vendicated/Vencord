/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText, BaseTextProps } from "./BaseText";

export type ParagraphProps = BaseTextProps<"p">;

export function Paragraph(props: ParagraphProps) {
    return (
        <BaseText tag="p" size="sm" weight="normal" {...props}>
            {props.children}
        </BaseText>
    );
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText, BaseTextProps } from "./BaseText";

export type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type HeadingProps = BaseTextProps<HeadingTag>;

export function Heading(props: HeadingProps) {
    return (
        <BaseText tag="h3" size="md" weight="semibold" {...props}>
            {props.children}
        </BaseText>
    );
}

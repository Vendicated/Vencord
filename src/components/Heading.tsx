/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./Heading.css";

import { classes } from "@utils/misc";
import type { ComponentPropsWithoutRef } from "react";

export type HeadingTag = `h${1 | 2 | 3 | 4 | 5 | 6}`;

export type HeadingProps<Tag extends HeadingTag> = ComponentPropsWithoutRef<Tag> & {
    tag?: Tag;
};

function HeadingBase<T extends HeadingTag>(props: HeadingProps<T>) {
    const {
        tag: Tag = "h5",
        children,
        className,
        ...restProps
    } = props;

    return (
        <Tag className={classes(`vc-${Tag}`, !className && `vc-${Tag}-defaultMargin`, className)} {...restProps}>
            {children}
        </Tag>
    );
}

// #region Old compability

/** @deprecated Use `Paragraph`, `Span` or `Text` instead */
export const Heading = HeadingBase as never;

/** @deprecated Use `Paragraph`, `Span` or `Text` instead */
export const HeadingPrimary = ((props: HeadingProps<"h2">) => <HeadingBase tag="h2" {...props} />) as never;

/** @deprecated Use `Paragraph`, `Span` or `Text` instead */
export const HeadingSecondary = ((props: HeadingProps<"h3">) => <HeadingBase tag="h3" {...props} />) as never;

/** @deprecated Use `Paragraph`, `Span` or `Text` instead */
export const HeadingTertiary = ((props: HeadingProps<"h4">) => <HeadingBase tag="h4" {...props} />) as never;

// #endregion

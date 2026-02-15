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

/**
 * A simple heading component that automatically sizes according to the tag used.
 *
 * If you need more control, use the BaseText component instead.
 */
export function Heading<T extends HeadingTag>(props: HeadingProps<T>) {
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

export function HeadingPrimary({ children, ...restProps }: HeadingProps<"h2">) {
    return (
        <Heading tag="h2" {...restProps}>
            {children}
        </Heading>
    );
}

export function HeadingSecondary({ children, ...restProps }: HeadingProps<"h3">) {
    return (
        <Heading tag="h3" {...restProps}>
            {children}
        </Heading>
    );
}

export function HeadingTertiary({ children, ...restProps }: HeadingProps<"h4">) {
    return (
        <Heading tag="h4" {...restProps}>
            {children}
        </Heading>
    );
}

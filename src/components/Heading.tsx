/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./Heading.css";

import { classes } from "@utils/misc";
import type { ComponentPropsWithoutRef } from "react";

export type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5";
export type HeadingProps<Tag extends HeadingTag> = ComponentPropsWithoutRef<Tag> & {
    tag?: Tag;
};

/**
 * A simple heading component that automatically sizes according to the tag used.
 *
 * If you need more control, use the BaseText component instead.
 */
export function Heading<T extends HeadingTag>(props: HeadingProps<T>) {
    const { tag: Tag = "h5", className, ...restProps } = props;

    return (
        <Tag className={classes(`vc-${Tag}`, !className && `vc-${Tag}-defaultMargin`, className)} {...restProps}>
            {props.children}
        </Tag>
    );
}

export function HeadingPrimary(props: HeadingProps<"h2">) {
    return (
        <Heading tag="h2" {...props}>
            {props.children}
        </Heading>
    );
}

export function HeadingSecondary(props: HeadingProps<"h3">) {
    return (
        <Heading tag="h3" {...props}>
            {props.children}
        </Heading>
    );
}

export function HeadingTertiary(props: HeadingProps<"h4">) {
    return (
        <Heading tag="h4" {...props}>
            {props.children}
        </Heading>
    );
}

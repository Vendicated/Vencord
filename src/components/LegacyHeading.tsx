/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./LegacyHeading.css";

import { classes } from "@utils/misc";
import type { ComponentPropsWithoutRef } from "react";

/** @deprecated Import `HeadingTag` from `@components/Heading` instead */
export type HeadingTag = `h${1 | 2 | 3 | 4 | 5 | 6}`;

/** @deprecated Import `HeadingProps` from `@components/Heading` instead */
export type HeadingProps<Tag extends HeadingTag> = ComponentPropsWithoutRef<Tag> & {
    tag?: Tag;
};

function LegacyHeading<T extends HeadingTag>(props: HeadingProps<T>) {
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

function LegacyHeadingPrimary({ children, ...restProps }: HeadingProps<"h2">) {
    return (
        <LegacyHeading tag="h2" {...restProps}>
            {children}
        </LegacyHeading>
    );
}

function LegacyHeadingSecondary({ children, ...restProps }: HeadingProps<"h3">) {
    return (
        <LegacyHeading tag="h3" {...restProps}>
            {children}
        </LegacyHeading>
    );
}

function LegacyHeadingTertiary({ children, ...restProps }: HeadingProps<"h4">) {
    return (
        <LegacyHeading tag="h4" {...restProps}>
            {children}
        </LegacyHeading>
    );
}

/** @deprecated Use `Heading` from `@components/Heading` instead */
export const Heading = LegacyHeading as never;

/** @deprecated Use `Heading` from `@components/Heading` with `tag="h2"` instead */
export const HeadingPrimary = LegacyHeadingPrimary as never;

/** @deprecated Use `Heading` from `@components/Heading` with `tag="h3"` instead */
export const HeadingSecondary = LegacyHeadingSecondary as never;

/** @deprecated Use `Heading` from `@components/Heading` with `tag="h4"` instead */
export const HeadingTertiary = LegacyHeadingTertiary as never;

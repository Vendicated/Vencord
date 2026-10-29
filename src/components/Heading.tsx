/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./Heading.css";

import { classes } from "@utils/misc";
import type { ComponentPropsWithoutRef } from "react";

import { Text, type TextProps, type TextSize, type TextWeight } from "./Text";

export type HeadingTag = `h${1 | 2 | 3 | 4 | 5 | 6}`;
export type HeadingProps<Tag extends HeadingTag = "h5"> = TextProps<Tag>;

const HeadingDefaults: Record<HeadingTag, { size: TextSize; weight: TextWeight; }> = {
    h1: { size: "lg", weight: "semibold" },
    h2: { size: "md", weight: "semibold" },
    h3: { size: "md", weight: "medium" },
    h4: { size: "md", weight: "semibold" },
    h5: { size: "md", weight: "medium" },
    h6: { size: "sm", weight: "semibold" },
};

export function Heading<T extends HeadingTag = "h5">(props: HeadingProps<T>) {
    const { tag = "h5", children, ...restProps } = props;

    return (
        <Text tag={tag} {...HeadingDefaults[tag]} {...restProps}>
            {children}
        </Text>
    );
}

// #region Old compability

type HeadingBaseProps<Tag extends HeadingTag> = ComponentPropsWithoutRef<Tag> & {
    tag?: Tag;
};

function HeadingBase<T extends HeadingTag>(props: HeadingBaseProps<T>) {
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

/** @deprecated Use `Heading` with `tag="h2"` instead */
export const HeadingPrimary = ((props: HeadingBaseProps<"h2">) => <HeadingBase tag="h2" {...props} />) as never;

/** @deprecated Use `Heading` with `tag="h3"` instead */
export const HeadingSecondary = ((props: HeadingBaseProps<"h3">) => <HeadingBase tag="h3" {...props} />) as never;

/** @deprecated Use `Heading` with `tag="h4"` instead */
export const HeadingTertiary = ((props: HeadingBaseProps<"h4">) => <HeadingBase tag="h4" {...props} />) as never;

// #endregion

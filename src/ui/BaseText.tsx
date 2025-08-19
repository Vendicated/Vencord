/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { classes } from "@utils/misc";
import type { ComponentPropsWithoutRef, JSX, ReactNode } from "react";

const cl = classNameFactory("vc-text-");

const Sizes = {
    xxs: "0.625rem",
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "1.5rem",
    xxl: "2rem"
} as const;

const Weights = {
    thin: "100",
    extralight: "200",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
} as const;

export type TextSize = keyof typeof Sizes;
export type TextWeight = keyof typeof Weights;

export type BaseTextProps<Tag extends keyof JSX.IntrinsicElements = "div"> = ComponentPropsWithoutRef<Tag> & {
    size?: TextSize;
    weight?: TextWeight;
    tag?: Tag;
};

export function generateTextCss() {
    let css = `.${cl("base")}{font-family:var(--font-primary);}`;

    for (const [size, value] of Object.entries(Sizes)) {
        css += `.${cl(size)}{font-size:${value};}`;
    }

    for (const [weight, value] of Object.entries(Weights)) {
        css += `.${cl(weight)}{font-weight:${value};}`;
    }

    return css;
}

export function BaseText<T extends keyof JSX.IntrinsicElements = "div">(props: BaseTextProps<T>): ReactNode {
    const {
        size = "md",
        weight = "normal",
        tag = "div",
        className,
        ...rest
    } = props;

    const Tag = tag as any; // Cast to any to avoid "Expression produces a union type that is too complex to represent"

    return (
        <Tag className={classes(cl("base", size, weight), className)} {...rest}>
            {props.children}
        </Tag>
    );
}

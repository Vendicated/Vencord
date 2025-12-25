/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./BaseText.css";

import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import type { Text as DiscordText } from "@vencord/discord-types";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const textCls = classNameFactory("vc-text-");

export const TextSizes = {
    xxs: "0.625rem",
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "1.5rem",
    xxl: "2rem"
} as const;

export const TextWeights = {
    thin: "100",
    extralight: "200",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
} as const;

export const TextColors = {
    "text-default": "var(--text-default)",
    "text-muted": "var(--text-muted)",
    "text-link": "var(--text-link)",
    "text-danger": "var(--text-feedback-critical)",
    "text-brand": "var(--text-brand)",
    "text-strong": "var(--text-strong)",
    "text-subtle": "var(--text-subtle)",
    "control-text-critical": "var(--control-text-critical-secondary-default)",
    "control-text-primary": "var(--control-text-primary-default)",
} as const;

export function generateTextCss() {
    let css = "";

    for (const [size, value] of Object.entries(TextSizes)) {
        css += `.${textCls(size)}{font-size:${value};}`;
    }

    for (const [weight, value] of Object.entries(TextWeights)) {
        css += `.${textCls(weight)}{font-weight:${value};}`;
    }

    return css;
}

export type TextSize = keyof typeof TextSizes;
export type TextWeight = keyof typeof TextWeights;
export type TextColor = keyof typeof TextColors;
export type TextTag = "div" | "span" | "p" | `h${1 | 2 | 3 | 4 | 5 | 6}`;

export type BaseTextProps<Tag extends TextTag = "div"> = ComponentPropsWithoutRef<Tag> & {
    size?: TextSize;
    weight?: TextWeight;
    color?: TextColor;
    tag?: Tag;
};

export function BaseText<T extends TextTag = "div">(props: BaseTextProps<T>): ReactNode {
    const {
        size = "md",
        weight = "normal",
        color,
        tag: Tag = "div",
        children,
        className,
        style,
        ...restProps
    } = props;

    return (
        <Tag
            className={classes(textCls("base", size, weight), className)}
            style={{
                ...style,
                ...(color && { color: TextColors[color] })
            }}
            {...restProps}
        >
            {children}
        </Tag>
    );
}

// #region Old compatibility

export const TextCompat: DiscordText = function TextCompat({ color, variant, ...restProps }) {
    const newBaseTextProps = restProps as BaseTextProps;

    if (variant) {
        const [left, right] = variant.split("/");
        if (left && right) {
            const size = left.split("-").pop();
            newBaseTextProps.size = size as TextSize;
            newBaseTextProps.weight = right as TextWeight;
        }
    }

    if (color) {
        newBaseTextProps.style ??= {};
        newBaseTextProps.style.color = `var(--${color}, var(--text-default))`;
    }

    return <BaseText {...newBaseTextProps} />;
};

// #endregion

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
    xxs: { fontSize: "10px", lineHeight: "1.2" },
    xs: { fontSize: "12px", lineHeight: "1.33333" },
    sm: { fontSize: "14px", lineHeight: "1.28571" },
    md: { fontSize: "16px", lineHeight: "1.25" },
    lg: { fontSize: "20px", lineHeight: "1.2" },
    xl: { fontSize: "24px", lineHeight: "1.25" },
    xxl: { fontSize: "32px", lineHeight: "1.25" },
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
    "text-invert": "var(--text-invert)",
    "text-feedback-critical": "var(--text-feedback-critical)",
    "text-feedback-info": "var(--text-feedback-info)",
    "text-feedback-positive": "var(--text-feedback-positive)",
    "text-feedback-warning": "var(--text-feedback-warning)",
    "text-status-dnd": "var(--text-status-dnd)",
    "text-status-idle": "var(--text-status-idle)",
    "text-status-offline": "var(--text-status-offline)",
    "text-status-online": "var(--text-status-online)",
    "control-text-critical": "var(--control-text-critical-secondary-default)",
    "control-text-primary": "var(--control-text-primary-default)",
} as const;

export function generateTextCss() {
    let css = "";

    for (const [size, { fontSize, lineHeight }] of Object.entries(TextSizes)) {
        css += `.${textCls(size)}{font-size:${fontSize};line-height:${lineHeight};}`;
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
    selectable?: boolean;
    lineClamp?: number;
    tabularNumbers?: boolean;
    defaultColor?: boolean;
};

export function BaseText<T extends TextTag = "div">(props: BaseTextProps<T>): ReactNode {
    const {
        size = "md",
        weight = "normal",
        color,
        tag: Tag = "div",
        selectable = false,
        lineClamp,
        tabularNumbers = false,
        defaultColor = true,
        children,
        className,
        style,
        ...restProps
    } = props;

    return (
        <Tag
            className={classes(
                textCls("base", size, weight),
                selectable && textCls("selectable"),
                lineClamp === 1 && textCls("line-clamp-1"),
                lineClamp != null && lineClamp > 1 && textCls("line-clamp"),
                tabularNumbers && textCls("tabular-numbers"),
                defaultColor && textCls("defaultColor"),
                className
            )}
            style={{
                ...style,
                ...(color && { color: TextColors[color] }),
                ...(lineClamp && lineClamp > 1 && { WebkitLineClamp: lineClamp })
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

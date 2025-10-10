/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./Button.css";

import { classNameFactory } from "@api/Styles";
import { classes } from "@utils/misc";
import { ComponentPropsWithRef } from "react";

import { Flex } from "./Flex";
import { HeadingPrimary, HeadingSecondary } from "./Heading";
import { OpenExternalIcon } from "./Icons";

const btnCls = classNameFactory("vc-btn-");
const textBtnCls = classNameFactory("vc-text-btn-");

export type ButtonProps = ComponentPropsWithRef<"button"> & {
    variant?: "primary" | "secondary" | "dangerPrimary" | "dangerSecondary" | "overlayPrimary" | "positive" | "link" | "none";
    size?: "min" | "sm" | "md" | "lg";
};

export type TextButtonProps = ComponentPropsWithRef<"button"> & {
    variant?: "primary" | "danger" | "link";
};

export function Button({ variant = "primary", size = "md", children, className, ...restProps }: ButtonProps) {
    const isLink = variant === "link";
    if (isLink) variant = "secondary";

    return (
        <button className={classes(btnCls("base", variant, size), className)} {...restProps}>
            {children}

            {isLink && <OpenExternalIcon className={btnCls("link-icon")} />}
        </button>
    );
}

export function TextButton({ variant = "primary", className, ...restProps }: TextButtonProps) {
    return (
        <button className={classes(textBtnCls("base", variant), className)} {...restProps} />
    );
}

export function Showcase() {
    const variants = ["primary", "secondary", "dangerPrimary", "dangerSecondary", "overlayPrimary", "positive", "link", "none"] as const;
    const sizes = ["min", "sm", "md", "lg"] as const;

    const textVariants = ["primary", "danger", "link"] as const;

    return (
        <>
            <HeadingPrimary>Buttons</HeadingPrimary>
            {variants.map(v => (
                <section key={v}>
                    <HeadingSecondary>{v}</HeadingSecondary>
                    <Flex style={{ alignItems: "center" }}>
                        {sizes.map(s => (
                            <Button
                                key={s}
                                variant={v}
                                size={s}
                                onClick={() => alert(`Clicked ${v} ${s} button!`)}
                            >
                                {s}
                            </Button>
                        ))}
                    </Flex>
                </section>
            ))}
            <HeadingPrimary>Text Buttons</HeadingPrimary>
            <Flex style={{ alignItems: "center" }}>
                {textVariants.map(v => (
                    <TextButton
                        key={v}
                        variant={v}
                        onClick={() => alert(`Clicked ${v} text button!`)}
                    >
                        {v}
                    </TextButton>
                ))}
            </Flex>
        </>
    );
}

/** @deprecated */
Button.Looks = {
    FILLED: "",
    LINK: "link"
} as const;

/** @deprecated */
Button.Colors = {
    BRAND: "primary",
    PRIMARY: "secondary",
    RED: "dangerPrimary",
    TRANSPARENT: "secondary",
    CUSTOM: "none",
    GREEN: "positive",
    LINK: "link"
} as const;

/** @deprecated */
Button.Sizes = {
    SMALL: "sm",
    MEDIUM: "md",
    LARGE: "lg",
    XLARGE: "lg",
    NONE: "min",
    MIN: "min"
} as const;

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./Button.css";

import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import type { ComponentPropsWithRef } from "react";

import { OpenExternalIcon } from "./Icons";
import { Link } from "./Link";

const btnCls = classNameFactory("vc-btn-");
const textBtnCls = classNameFactory("vc-text-btn-");

export type ButtonVariant =
    "primary" | "secondary" | "dangerPrimary" | "dangerSecondary" | "overlayPrimary" | "positive" | "link" | "none";
export type ButtonSize = "min" | "xs" | "small" | "medium" | "iconOnly";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
};

export type LinkButtonProps = ComponentPropsWithRef<"a"> & {
    size?: ButtonSize;
    variant?: ButtonVariant;
};

export function Button({ variant = "primary", size = "medium", children, className, ...restProps }: ButtonProps) {
    return (
        <button data-mana-component="button" className={classes(btnCls("base", variant, size), className)} {...restProps}>
            {children}
            {variant === "link" && <OpenExternalIcon className={btnCls("link-icon")} />}
        </button>
    );
}

export function LinkButton({ variant = "link", size = "medium", className, children, ...restProps }: LinkButtonProps) {
    return (
        <Link data-mana-component="button" className={classes(btnCls("base", variant, size), className)} {...restProps}>
            {children}
            <OpenExternalIcon className={btnCls("link-icon")} />
        </Link>
    );
}

export type TextButtonVariant = "primary" | "secondary" | "danger" | "link";

export type TextButtonProps = ComponentPropsWithRef<"button"> & {
    variant?: TextButtonVariant;
};

export function TextButton({ variant = "primary", className, ...restProps }: TextButtonProps) {
    return (
        <button className={classes(textBtnCls("base", variant), className)} {...restProps} />
    );
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./Card.css";

import { classNameFactory } from "@api/Styles";
import { classes } from "@utils/misc";
import { ComponentPropsWithRef } from "react";

const cl = classNameFactory("vc-card-");

export interface CardProps extends ComponentPropsWithRef<"div"> {
    variant?: "normal" | "warning" | "danger";
    /** Add a default padding of 1em to the card. This is implied if no className prop is passed */
    defaultPadding?: boolean;
}

export function Card({ variant = "normal", defaultPadding, children, className, ...restProps }: CardProps) {
    const addDefaultPadding = defaultPadding != null
        ? defaultPadding
        : !className;

    return (
        <div className={classes(cl("base", variant, addDefaultPadding && "defaultPadding"), className)} {...restProps}>
            {children}
        </div>
    );
}

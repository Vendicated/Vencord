/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./Link.css";

import { classes } from "@utils/misc";
import type { AnchorHTMLAttributes, PropsWithChildren } from "react";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    disabled?: boolean;
}

export function Link({ disabled, className, children, ...restProps }: PropsWithChildren<LinkProps>) {
    return (
        <a
            role="link"
            target="_blank"
            rel="noreferrer noopener"
            className={classes("vc-link", disabled && "vc-link-disabled", className)}
            aria-disabled={disabled}
            {...restProps}
        >
            {children}
        </a>
    );
}

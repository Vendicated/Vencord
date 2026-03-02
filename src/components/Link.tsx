/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./Link.css";

import { classes } from "@utils/misc";
import type { AnchorHTMLAttributes, DetailedHTMLProps, PropsWithChildren } from "react";

export interface LinkProps extends DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> {
    disabled?: boolean;
    useDefaultUnderlineStyles?: boolean;
}

export function Link({
    disabled,
    useDefaultUnderlineStyles = true,
    href,
    rel,
    target,
    className,
    children,
    ...restProps
}: PropsWithChildren<LinkProps>) {

    const isInternal = href && /^(?:discord:\/)?\/[a-zA-Z0-9_-]/.test(href);
    const needsSafeAttrs = href && !isInternal;

    return (
        <a
            role="link"
            href={href}
            target={target ?? (needsSafeAttrs ? "_blank" : undefined)}
            rel={rel ?? (needsSafeAttrs ? "noreferrer noopener" : undefined)}
            className={classes(
                "vc-link",
                useDefaultUnderlineStyles && "vc-link-underline-on-hover",
                disabled && "vc-link-disabled",
                className
            )}
            aria-disabled={disabled}
            {...restProps}
        >
            {children}
        </a>
    );
}

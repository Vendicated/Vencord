/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./Divider.css";

import { classes } from "@utils/misc";
import type { CSSProperties } from "react";

export interface DividerProps {
    className?: string;
    style?: CSSProperties;
}

export function Divider({ className, style }: DividerProps) {
    return (
        <hr
            className={classes("vc-divider", className)}
            style={style}
        />
    );
}
